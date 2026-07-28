import {
    PermissionFlagsBits,
    type Client,
    type GuildMember,
    type Message
} from 'discord.js';
import { addModerationHistory, createWarning } from '../../database/db.ts';
import { logger } from '../logger.ts';
import { logModeration } from './logger.ts';
import {
    getAutoModSettings,
    getAutoModStrikeCount,
    recordAutoModViolation,
    type AutoModRule,
    type AutoModSettings
} from './automodService.ts';

interface RecentMessage {
    at: number;
    normalized: string;
}

const RULE_LABELS: Record<AutoModRule, string> = {
    link: 'lien externe interdit',
    invite: 'invitation Discord interdite',
    spam: 'rafale de messages',
    duplicate: 'messages répétés',
    caps: 'usage excessif des majuscules',
    mentions: 'mentions massives'
};

const INVITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-z0-9-]+)/gi;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>()]+|\b[a-z0-9](?:[a-z0-9-]{0,62}\.)+[a-z]{2,24}(?:\/[^\s<>()]*)?/gi;

export class AutoModeration {
    private readonly recentMessages = new Map<string, RecentMessage[]>();
    private readonly queues = new Map<string, Promise<boolean>>();
    private readonly cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

    constructor(private readonly client: Client) {}

    async handleMessage(message: Message): Promise<boolean> {
        if (!message.guild) return false;
        const key = `${message.guild.id}:${message.author.id}`;
        const previous = this.queues.get(key) ?? Promise.resolve(false);
        const next = previous.catch(() => false).then(() => this.processMessage(message));
        this.queues.set(key, next);
        try {
            return await next;
        } finally {
            if (this.queues.get(key) === next) this.queues.delete(key);
        }
    }

    private async processMessage(message: Message): Promise<boolean> {
        if (!message.guild || !message.member || message.author.bot) return false;
        const settings = await getAutoModSettings(message.guild.id);
        if (!settings.enabled || this.isExempt(message, settings)) return false;

        const rule = await this.detectViolation(message, settings);
        if (!rule) return false;

        await message.delete().catch(() => undefined);
        const strikes = await getAutoModStrikeCount(message.guild.id, message.author.id) + 1;
        let action = await this.applyAction(message.member, rule, settings);
        if (settings.action === 'timeout' && strikes >= settings.strike_threshold) {
            action = await this.timeoutMember(message.member, rule, settings, strikes).catch(error => {
                logger.warn(`Timeout AutoMod impossible pour ${message.author.id}`, error, 'AUTOMOD');
                return 'delete';
            });
        }
        await recordAutoModViolation(
            message.guild.id,
            message.author.id,
            message.channel.id,
            message.id,
            rule,
            action,
            message.content
        );

        await this.sendLog(message, rule, action, strikes);
        await this.notifyInChannel(message, rule, action, settings);
        return true;
    }

    private isExempt(message: Message, settings: AutoModSettings): boolean {
        const member = message.member!;
        if (
            member.permissions.has(PermissionFlagsBits.Administrator) ||
            member.permissions.has(PermissionFlagsBits.ManageMessages)
        ) return true;
        if (settings.excluded_channel_ids.includes(message.channel.id)) return true;
        const parentId = 'parentId' in message.channel
            ? message.channel.parentId as string | null
            : null;
        if (parentId && settings.excluded_channel_ids.includes(parentId)) return true;
        return member.roles.cache.some(role => settings.excluded_role_ids.includes(role.id));
    }

    private async detectViolation(message: Message, settings: AutoModSettings): Promise<AutoModRule | null> {
        const content = message.content;
        let contentForLinks = content;
        if (settings.anti_invite_enabled) {
            const matches = [...content.matchAll(INVITE_PATTERN)];
            for (const match of matches) {
                if (!settings.allow_own_invites || !await this.isOwnServerInvite(message, match[1])) return 'invite';
                contentForLinks = contentForLinks.replace(match[0], '');
            }
        }
        if (settings.anti_link_enabled && this.hasBlockedLink(contentForLinks, settings.allowed_domains)) return 'link';

        const mentionCount = message.mentions.users.size + message.mentions.roles.size +
            (message.mentions.everyone ? settings.mention_limit : 0);
        if (settings.anti_mention_enabled && mentionCount >= settings.mention_limit) return 'mentions';

        const recent = this.trackMessage(message, settings);
        const now = Date.now();
        if (settings.anti_spam_enabled) {
            const start = now - settings.spam_interval_seconds * 1000;
            if (recent.filter(entry => entry.at >= start).length >= settings.spam_message_count) return 'spam';
        }
        if (settings.anti_duplicate_enabled) {
            const normalized = this.normalize(message.content);
            if (normalized.length >= 3) {
                const start = now - settings.duplicate_interval_seconds * 1000;
                const duplicates = recent.filter(entry => entry.at >= start && entry.normalized === normalized).length;
                if (duplicates >= settings.duplicate_message_count) return 'duplicate';
            }
        }
        if (settings.anti_caps_enabled && this.isCapsAbuse(content, settings)) return 'caps';
        return null;
    }

    private trackMessage(message: Message, settings: AutoModSettings): RecentMessage[] {
        const key = `${message.guildId}:${message.author.id}`;
        const longestWindow = Math.max(settings.spam_interval_seconds, settings.duplicate_interval_seconds) * 1000;
        const entries = (this.recentMessages.get(key) ?? [])
            .filter(entry => Date.now() - entry.at <= longestWindow);
        entries.push({ at: Date.now(), normalized: this.normalize(message.content) });
        this.recentMessages.set(key, entries.slice(-Math.max(settings.spam_message_count, settings.duplicate_message_count) * 2));
        const previousTimer = this.cleanupTimers.get(key);
        if (previousTimer) clearTimeout(previousTimer);
        this.cleanupTimers.set(key, setTimeout(() => {
            this.recentMessages.delete(key);
            this.cleanupTimers.delete(key);
        }, longestWindow + 60_000));
        return entries;
    }

    private normalize(content: string): string {
        return content.toLocaleLowerCase()
            .normalize('NFKC')
            .replace(/\s+/g, ' ')
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .trim();
    }

    private isCapsAbuse(content: string, settings: AutoModSettings): boolean {
        const letters = [...content].filter(character => /\p{L}/u.test(character));
        if (letters.length < settings.caps_min_letters) return false;
        const uppercase = letters.filter(character =>
            character === character.toLocaleUpperCase() &&
            character !== character.toLocaleLowerCase()
        ).length;
        return uppercase / letters.length * 100 >= settings.caps_percentage;
    }

    private hasBlockedLink(content: string, allowedDomains: string[]): boolean {
        const matches = content.match(URL_PATTERN) ?? [];
        return matches.some(raw => {
            try {
                const hostname = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
                    .hostname.toLocaleLowerCase()
                    .replace(/^www\./, '');
                return !allowedDomains.some(domain => {
                    const allowed = domain.toLocaleLowerCase().replace(/^www\./, '').replace(/^\.+|\.+$/g, '');
                    return allowed && (hostname === allowed || hostname.endsWith(`.${allowed}`));
                });
            } catch {
                return true;
            }
        });
    }

    private async isOwnServerInvite(message: Message, code: string): Promise<boolean> {
        try {
            const invite = await this.client.fetchInvite(code);
            return invite.guild?.id === message.guildId;
        } catch {
            return false;
        }
    }

    private async applyAction(
        member: GuildMember,
        rule: AutoModRule,
        settings: AutoModSettings
    ): Promise<string> {
        const reason = `Auto-modération : ${RULE_LABELS[rule]}`;
        if (settings.action === 'warn') {
            const sanctionNumber = await createWarning(member.guild.id, member.id, this.client.user!.id, reason);
            await addModerationHistory(
                member.guild.id,
                member.id,
                this.client.user!.id,
                'automod_warn',
                reason,
                undefined,
                sanctionNumber
            );
            return `warn #${sanctionNumber}`;
        }
        return 'delete';
    }

    private async timeoutMember(
        member: GuildMember,
        rule: AutoModRule,
        settings: AutoModSettings,
        strikes: number
    ): Promise<string> {
        if (!member.moderatable || member.isCommunicationDisabled()) return 'delete';
        const durationMs = Math.min(settings.timeout_seconds * 1000, 28 * 24 * 60 * 60 * 1000);
        const reason = `Auto-modération : ${RULE_LABELS[rule]} (${strikes} infractions)`;
        await member.timeout(durationMs, reason);
        const sanctionNumber = await addModerationHistory(
            member.guild.id,
            member.id,
            this.client.user!.id,
            'automod_timeout',
            reason,
            `${settings.timeout_seconds}s`
        );
        return `timeout ${settings.timeout_seconds}s · sanction #${sanctionNumber}`;
    }

    private async notifyInChannel(
        message: Message,
        rule: AutoModRule,
        action: string,
        settings: AutoModSettings
    ) {
        if (!settings.notify_user || !message.channel.isSendable()) return;
        const response = await message.channel.send({
            content: `<@${message.author.id}>, message retiré : **${RULE_LABELS[rule]}** (${action}).`,
            allowedMentions: { users: [message.author.id] }
        }).catch(() => null);
        if (response) setTimeout(() => void response.delete().catch(() => undefined), 8_000);
    }

    private async sendLog(message: Message, rule: AutoModRule, action: string, strikes: number) {
        const reason = `${RULE_LABELS[rule]} · ${strikes} infraction(s) dans la période`;
        await logModeration(
            message.guild!,
            'AutoMod',
            message.author,
            this.client.user!,
            `${reason}\nSalon : <#${message.channel.id}>\nContenu : ${message.content.slice(0, 500) || '*sans texte*'}`,
            action
        );
        logger.info(`AutoMod ${rule} pour ${message.author.id} sur ${message.guildId}`, { action, strikes }, 'AUTOMOD');
    }
}
