import {
    PermissionFlagsBits,
    type Client,
    type GuildMember,
    type Message
} from 'discord.js';
import { addModerationHistory, createWarning } from '../../database/db.ts';
import { logger } from '../logger.ts';
import { createKeplerEmbed } from '../theme.ts';
import { logModeration } from './logger.ts';
import {
    getAutoModSettings,
    getAutoModStrikeCount,
    recordAutoModViolation,
    type AutoModAction,
    type AutoModRule,
    type AutoModSource,
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
    mentions: 'mentions massives',
    keyword: 'contenu interdit'
};

const INVITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-z0-9-]+)/gi;
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>()]+|\b[a-z0-9](?:[a-z0-9-]{0,62}\.)+[a-z]{2,24}(?:\/[^\s<>()]*)?/gi;

export class AutoModeration {
    private readonly recentMessages = new Map<string, RecentMessage[]>();
    private readonly queues = new Map<string, Promise<boolean>>();
    private readonly enforcementQueues = new Map<string, Promise<void>>();
    private readonly cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private readonly lastNotificationAt = new Map<string, number>();
    private readonly recentJoins = new Map<string, number[]>();
    private readonly raidModeUntil = new Map<string, number>();

    constructor(private readonly client: Client) {}

    async handleMemberJoin(member: GuildMember): Promise<void> {
        const settings = await getAutoModSettings(member.guild.id);
        if (!settings.enabled || !settings.anti_raid_enabled || member.user.bot) return;
        const now = Date.now();
        const windowStart = now - settings.raid_interval_seconds * 1000;
        const joins = (this.recentJoins.get(member.guild.id) ?? []).filter(at => at >= windowStart);
        joins.push(now);
        this.recentJoins.set(member.guild.id, joins);
        const wasActive = (this.raidModeUntil.get(member.guild.id) ?? 0) > now;
        if (joins.length >= settings.raid_join_count) {
            this.raidModeUntil.set(member.guild.id, now + settings.raid_mode_seconds * 1000);
            if (!wasActive) await logModeration(
                member.guild,
                'AutoMod',
                member.user,
                this.client.user!,
                `Mode anti-raid activé : ${joins.length} arrivées en ${settings.raid_interval_seconds}s`,
                `${settings.raid_mode_seconds}s`
            );
        }
        if ((this.raidModeUntil.get(member.guild.id) ?? 0) <= now) return;
        const accountAgeHours = (now - member.user.createdTimestamp) / 3_600_000;
        if (accountAgeHours >= settings.raid_account_age_hours || !member.moderatable) return;
        await member.timeout(
            Math.min(settings.timeout_seconds * 1000, 28 * 86_400_000),
            `AutoMod anti-raid : compte créé il y a ${Math.floor(accountAgeHours)}h`
        ).catch(error => logger.warn(`Timeout anti-raid impossible pour ${member.id}`, error, 'AUTOMOD'));
    }

    async handleMessage(message: Message, source: AutoModSource = 'message_create'): Promise<boolean> {
        if (!message.guild) return false;
        const key = `${message.guild.id}:${message.author.id}`;
        const previous = this.queues.get(key) ?? Promise.resolve(false);
        const next = previous.catch(() => false).then(() => this.processMessage(message, source));
        this.queues.set(key, next);
        try {
            return await next;
        } finally {
            if (this.queues.get(key) === next) this.queues.delete(key);
        }
    }

    private async processMessage(message: Message, source: AutoModSource): Promise<boolean> {
        if (!message.guild || !message.member || message.author.bot) return false;
        const settings = await getAutoModSettings(message.guild.id);
        if (!settings.enabled || this.isExempt(message, settings)) return false;

        const rule = await this.detectViolation(message, settings, source === 'message_create');
        if (!rule) return false;

        if (!settings.observation_mode) await message.delete().catch(() => undefined);
        void this.enqueueEnforcement(message, rule, settings, source);
        return !settings.observation_mode;
    }

    private async enforceViolation(
        message: Message,
        rule: AutoModRule,
        settings: AutoModSettings,
        source: AutoModSource
    ): Promise<void> {
        const member = message.member;
        if (!message.guild || !member) return;
        const strikes = await getAutoModStrikeCount(message.guild.id, message.author.id) + 1;
        const selectedAction = this.resolveAction(rule, settings, strikes);
        let action = settings.observation_mode ? 'observed' : await this.applyAction(member, rule, selectedAction);
        if (!settings.observation_mode && selectedAction === 'timeout') {
            const timeoutSeconds = this.resolveTimeoutSeconds(settings, strikes);
            action = await this.timeoutMember(member, rule, timeoutSeconds, strikes).catch(error => {
                logger.warn(`Timeout AutoMod impossible pour ${message.author.id}`, error, 'AUTOMOD');
                return 'delete';
            });
        }
        if (!settings.observation_mode) void this.notifyUser(message, rule, action, settings);
        await recordAutoModViolation(
            message.guild.id,
            message.author.id,
            message.channel.id,
            message.id,
            rule,
            action,
            message.content,
            source,
            settings.observation_mode
        );

        void this.sendLog(message, rule, action, strikes).catch(error => {
            logger.warn(`Log AutoMod non envoyé pour ${message.id}`, error, 'AUTOMOD');
        });
    }

    private async enqueueEnforcement(
        message: Message,
        rule: AutoModRule,
        settings: AutoModSettings,
        source: AutoModSource
    ): Promise<void> {
        const key = `${message.guildId}:${message.author.id}`;
        const previous = this.enforcementQueues.get(key) ?? Promise.resolve();
        const next = previous
            .catch(() => undefined)
            .then(() => this.enforceViolation(message, rule, settings, source));
        this.enforcementQueues.set(key, next);
        try {
            await next;
        } catch (error) {
            logger.error(`Sanction AutoMod incomplète pour ${message.author.id}`, error, 'AUTOMOD');
        } finally {
            if (this.enforcementQueues.get(key) === next) this.enforcementQueues.delete(key);
        }
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

    private async detectViolation(message: Message, settings: AutoModSettings, trackActivity: boolean): Promise<AutoModRule | null> {
        const content = message.content;
        if (settings.anti_keyword_enabled && this.hasBlockedKeyword(content, settings)) return 'keyword';
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

        const recent = trackActivity ? this.trackMessage(message, settings) : [];
        const now = Date.now();
        if (trackActivity && settings.anti_spam_enabled) {
            const start = now - settings.spam_interval_seconds * 1000;
            if (recent.filter(entry => entry.at >= start).length >= settings.spam_message_count) return 'spam';
        }
        if (trackActivity && settings.anti_duplicate_enabled) {
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

    private normalizeForKeyword(content: string): string {
        return content.toLocaleLowerCase()
            .normalize('NFKD')
            .replace(/\p{M}/gu, '')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[_.*~|`-]+/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private hasBlockedKeyword(content: string, settings: AutoModSettings): boolean {
        const normalized = this.normalizeForKeyword(content);
        if (settings.allowed_keywords.some(value => normalized.includes(this.normalizeForKeyword(value)))) return false;
        if (settings.blocked_keywords.some(value => normalized.includes(this.normalizeForKeyword(value)))) return true;
        return settings.regex_patterns.some(pattern => {
            try {
                return new RegExp(pattern, 'iu').test(content);
            } catch {
                return false;
            }
        });
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

    private resolveAction(rule: AutoModRule, settings: AutoModSettings, strikes: number): AutoModAction {
        const steps = [...settings.escalation_steps]
            .filter(step => Number.isInteger(step.strikes) && step.strikes > 0)
            .sort((a, b) => a.strikes - b.strikes);
        let action = settings.rule_actions[rule] ?? settings.action;
        for (const step of steps) if (strikes >= step.strikes) action = step.action;
        if (!steps.length && action === 'timeout' && strikes < settings.strike_threshold) return 'delete';
        return action;
    }

    private resolveTimeoutSeconds(settings: AutoModSettings, strikes: number): number {
        let seconds = settings.timeout_seconds;
        for (const step of [...settings.escalation_steps].sort((a, b) => a.strikes - b.strikes)) {
            if (strikes >= step.strikes && step.action === 'timeout' && step.timeout_seconds) seconds = step.timeout_seconds;
        }
        return seconds;
    }

    private async applyAction(member: GuildMember, rule: AutoModRule, action: AutoModAction): Promise<string> {
        const reason = `Auto-modération : ${RULE_LABELS[rule]}`;
        if (action === 'warn') {
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
        timeoutSeconds: number,
        strikes: number
    ): Promise<string> {
        if (!member.moderatable || member.isCommunicationDisabled()) return 'delete';
        const durationMs = Math.min(timeoutSeconds * 1000, 28 * 24 * 60 * 60 * 1000);
        const reason = `Auto-modération : ${RULE_LABELS[rule]} (${strikes} infractions)`;
        await member.timeout(durationMs, reason);
        const sanctionNumber = await addModerationHistory(
            member.guild.id,
            member.id,
            this.client.user!.id,
            'automod_timeout',
            reason,
            `${timeoutSeconds}s`
        );
        return `timeout ${timeoutSeconds}s · sanction #${sanctionNumber}`;
    }

    private async notifyUser(
        message: Message,
        rule: AutoModRule,
        action: string,
        settings: AutoModSettings
    ) {
        if (!settings.notify_user) return;
        const notificationKey = `${message.guildId}:${message.author.id}`;
        const lastNotification = this.lastNotificationAt.get(notificationKey) ?? 0;
        if (Date.now() - lastNotification < 15_000) return;
        const notificationAt = Date.now();
        this.lastNotificationAt.set(notificationKey, notificationAt);
        setTimeout(() => {
            if (this.lastNotificationAt.get(notificationKey) === notificationAt) {
                this.lastNotificationAt.delete(notificationKey);
            }
        }, 15_000);
        const actionLabel = action.startsWith('timeout')
            ? `Timeout · ${action.replace(/^timeout\s*/, '')}`
            : action.startsWith('warn')
                ? `Avertissement · ${action.replace(/^warn\s*/, '')}`
                : 'Message supprimé';
        const embed = createKeplerEmbed('warning')
            .setTitle('Message modéré')
            .setDescription(`Un de vos messages a été retiré sur **${message.guild!.name}**.`)
            .addFields(
                { name: 'Règle déclenchée', value: RULE_LABELS[rule], inline: true },
                { name: 'Action', value: actionLabel, inline: true },
                { name: 'Salon', value: `<#${message.channel.id}>`, inline: true }
            )
            .setFooter({ text: 'Cette notification est privée et visible uniquement par vous.' });
        await message.author.send({ embeds: [embed] }).catch(() => {
            logger.debug(`Notification AutoMod impossible en MP pour ${message.author.id}`, undefined, 'AUTOMOD');
        });
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
