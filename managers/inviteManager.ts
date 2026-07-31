import {
    type Client,
    type Guild,
    type GuildMember,
    type Invite,
    type TextBasedChannel
} from 'discord.js';
import { createKeplerEmbed } from '../utils/theme.ts';
import { logger } from '../utils/logger.ts';
import {
    countInviteJoins,
    getInviteSettings,
    markInviteDeleted,
    recordInviteJoin,
    recordInviteLeave,
    saveInvites,
    type StoredInvite
} from '../utils/invites/service.ts';

type InviteSnapshot = Map<string, StoredInvite>;

export class InviteManager {
    private readonly cache = new Map<string, InviteSnapshot>();
    private readonly recentlyDeleted = new Map<string, Array<{ invite: StoredInvite; deletedAt: number }>>();
    private readonly queues = new Map<string, Promise<void>>();

    constructor(private readonly client: Client) {}

    async start(): Promise<void> {
        await Promise.all(this.client.guilds.cache.map(guild => this.refreshGuild(guild)));
    }

    async handleGuildCreate(guild: Guild): Promise<void> {
        await this.refreshGuild(guild);
    }

    async synchronizeGuild(guild: Guild): Promise<void> {
        await this.refreshGuild(guild);
    }

    async handleInviteCreate(invite: Invite): Promise<void> {
        if (!invite.guild || !('members' in invite.guild)) return;
        const guild = invite.guild;
        const stored = this.toStoredInvite(invite, guild.id);
        const snapshot = this.cache.get(guild.id) ?? new Map();
        snapshot.set(invite.code, stored);
        this.cache.set(guild.id, snapshot);
        await saveInvites([stored]);

        const settings = await getInviteSettings(guild.id);
        if (settings.enabled && settings.log_invite_create) {
            await this.sendLog(guild, 'Invitation créée', `Le lien \`discord.gg/${invite.code}\` a été créé.`, 'success', [
                { name: 'Créateur', value: invite.inviter ? `<@${invite.inviter.id}>` : 'Inconnu', inline: true },
                { name: 'Salon', value: invite.channelId ? `<#${invite.channelId}>` : 'Inconnu', inline: true },
                { name: 'Limite', value: invite.maxUses ? `${invite.maxUses} utilisation(s)` : 'Illimitée', inline: true }
            ]);
        }
    }

    async handleInviteDelete(invite: Invite): Promise<void> {
        if (!invite.guild || !('members' in invite.guild)) return;
        const guild = invite.guild;
        const previous = this.cache.get(guild.id)?.get(invite.code);
        const deleted = this.toStoredInvite(invite, guild.id);
        if (previous) {
            deleted.inviter_id ??= previous.inviter_id;
            deleted.channel_id ??= previous.channel_id;
            deleted.uses = Math.max(deleted.uses, previous.uses);
        }
        const recent = this.recentlyDeleted.get(guild.id) ?? [];
        recent.push({ invite: deleted, deletedAt: Date.now() });
        this.recentlyDeleted.set(guild.id, recent.slice(-10));
        this.cache.get(guild.id)?.delete(invite.code);
        await markInviteDeleted(guild.id, invite.code);

        const settings = await getInviteSettings(guild.id);
        if (settings.enabled && settings.log_invite_delete) {
            await this.sendLog(guild, 'Invitation supprimée', `Le lien \`discord.gg/${invite.code}\` n’est plus actif.`, 'danger', [
                { name: 'Créateur', value: invite.inviter ? `<@${invite.inviter.id}>` : 'Inconnu', inline: true },
                { name: 'Utilisations Discord', value: String(invite.uses ?? 0), inline: true }
            ]);
        }
    }

    async handleMemberJoin(member: GuildMember): Promise<void> {
        await this.enqueue(member.guild.id, async () => {
            const settings = await getInviteSettings(member.guild.id);
            if (!settings.enabled) return;

            const previous = this.cache.get(member.guild.id) ?? new Map();
            const current = await this.fetchGuildInvites(member.guild);
            let used = [...current.values()]
                .filter(invite => invite.uses > (previous.get(invite.code)?.uses ?? 0))
                .sort((a, b) => {
                    const deltaA = a.uses - (previous.get(a.code)?.uses ?? 0);
                    const deltaB = b.uses - (previous.get(b.code)?.uses ?? 0);
                    return deltaB - deltaA;
                })[0] ?? null;
            if (!used) {
                const recent = (this.recentlyDeleted.get(member.guild.id) ?? [])
                    .filter(entry => Date.now() - entry.deletedAt < 10_000);
                used = recent.at(-1)?.invite ?? null;
                this.recentlyDeleted.set(member.guild.id, recent.slice(0, -1));
            }

            this.cache.set(member.guild.id, current);
            await saveInvites([...current.values()]);
            await recordInviteJoin(member.guild.id, member.id, used?.code ?? null, used?.inviter_id ?? null);

            const trackedUses = used ? await countInviteJoins(member.guild.id, used.code) : 0;
            await this.sendJoinMessages(member, used, trackedUses);
        });
    }

    async handleMemberRemove(member: GuildMember): Promise<void> {
        await recordInviteLeave(member.guild.id, member.id);
    }

    private async refreshGuild(guild: Guild): Promise<void> {
        try {
            const invites = await this.fetchGuildInvites(guild);
            this.cache.set(guild.id, invites);
            await saveInvites([...invites.values()]);
        } catch (error) {
            logger.warn(`Invitations non synchronisées pour ${guild.name}`, error, 'INVITES');
        }
    }

    private async fetchGuildInvites(guild: Guild): Promise<InviteSnapshot> {
        const fetched = await guild.invites.fetch();
        const snapshot = new Map(fetched.map(invite => [invite.code, this.toStoredInvite(invite, guild.id)]));
        if (guild.vanityURLCode) {
            const vanity = await guild.fetchVanityData().catch(() => null);
            if (vanity?.code) {
                snapshot.set(vanity.code, {
                    guild_id: guild.id,
                    code: vanity.code,
                    inviter_id: null,
                    channel_id: null,
                    uses: vanity.uses,
                    max_uses: 0,
                    max_age: 0,
                    temporary: false,
                    created_at: null,
                    expires_at: null
                });
            }
        }
        return snapshot;
    }

    private toStoredInvite(invite: Invite, guildId: string): StoredInvite {
        return {
            guild_id: guildId,
            code: invite.code,
            inviter_id: invite.inviterId ?? null,
            channel_id: invite.channelId ?? null,
            uses: invite.uses ?? 0,
            max_uses: invite.maxUses ?? 0,
            max_age: invite.maxAge ?? 0,
            temporary: invite.temporary ?? false,
            created_at: invite.createdAt?.toISOString() ?? null,
            expires_at: invite.expiresAt?.toISOString() ?? null
        };
    }

    private async sendJoinMessages(member: GuildMember, invite: StoredInvite | null, trackedUses: number) {
        const settings = await getInviteSettings(member.guild.id);
        const code = invite?.code ?? 'inconnue';
        const inviter = invite?.inviter_id ? `<@${invite.inviter_id}>` : 'Inconnu';
        const values: Record<string, string> = {
            membre: `<@${member.id}>`,
            membre_nom: member.user.username,
            serveur: member.guild.name,
            code,
            inviteur: inviter,
            utilisations: String(trackedUses),
            membres: String(member.guild.memberCount),
            canal: invite?.channel_id ? `<#${invite.channel_id}>` : 'Inconnu'
        };
        const render = (text: string) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
        const fields = [];
        if (settings.show_invite_code) fields.push({ name: 'Lien utilisé', value: code === 'inconnue' ? 'Inconnu' : `discord.gg/${code}`, inline: true });
        if (settings.show_inviter) fields.push({ name: 'Créé par', value: inviter, inline: true });
        if (settings.show_invite_uses) fields.push({ name: 'Arrivées via ce lien', value: String(trackedUses), inline: true });
        if (settings.show_invite_channel) fields.push({ name: 'Salon du lien', value: values.canal, inline: true });
        if (settings.show_member_count) fields.push({ name: 'Membres', value: String(member.guild.memberCount), inline: true });
        if (settings.show_account_age) fields.push({
            name: 'Compte créé',
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            inline: true
        });

        if (settings.log_invite_use) {
            await this.sendLog(
                member.guild,
                'Invitation utilisée',
                `${member} a rejoint le serveur${invite ? ` avec \`discord.gg/${invite.code}\`` : ', mais le lien utilisé n’a pas pu être identifié'}.`,
                invite ? 'success' : 'warning',
                fields
            );
        }

        if (!settings.welcome_enabled || !settings.welcome_channel_id) return;
        const channel = await member.guild.channels.fetch(settings.welcome_channel_id).catch(() => null);
        if (!channel?.isTextBased()) return;
        const embed = createKeplerEmbed('primary')
            .setTitle('Nouvelle arrivée')
            .setDescription(render(settings.welcome_message).slice(0, 4096))
            .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
            .setFooter({ text: member.guild.name });
        if (fields.length) embed.addFields(fields);
        await (channel as TextBasedChannel).send({ embeds: [embed] });
    }

    private async sendLog(
        guild: Guild,
        title: string,
        description: string,
        tone: 'success' | 'warning' | 'danger',
        fields: Array<{ name: string; value: string; inline?: boolean }>
    ): Promise<void> {
        const settings = await getInviteSettings(guild.id);
        if (!settings.log_channel_id) return;
        const channel = await guild.channels.fetch(settings.log_channel_id).catch(() => null);
        if (!channel?.isTextBased()) return;
        const embed = createKeplerEmbed(tone)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: 'Manager d’invitations' });
        if (fields.length) embed.addFields(fields);
        await (channel as TextBasedChannel).send({ embeds: [embed] });
    }

    private async enqueue(guildId: string, task: () => Promise<void>): Promise<void> {
        const previous = this.queues.get(guildId) ?? Promise.resolve();
        const next = previous.catch(() => undefined).then(task);
        this.queues.set(guildId, next);
        try {
            await next;
        } finally {
            if (this.queues.get(guildId) === next) this.queues.delete(guildId);
        }
    }
}
