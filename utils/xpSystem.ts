import {
    ChannelType,
    type Guild,
    type GuildMember,
    type Message
} from 'discord.js';
import { supabase } from '../database/supabase.ts';
import { createKeplerEmbed, setRequesterFooter } from './theme.ts';
import { logger } from './logger.ts';

export const XP_COOLDOWN_SECONDS = 60;
export const XP_MIN_GAIN = 15;
export const XP_MAX_GAIN = 25;
const SETTINGS_CACHE_TTL = 60_000;
const settingsCache = new Map<string, { settings: XpSettings; expiresAt: number }>();
const roleBoostCache = new Map<string, { boosts: XpRoleBoost[]; expiresAt: number }>();

export interface XpProfile {
    guild_id: string;
    user_id: string;
    xp: number;
    level: number;
    message_count: number;
}

export interface XpReward {
    guild_id: string;
    level: number;
    role_id: string;
}

export interface XpSettings {
    guild_id: string;
    enabled: boolean;
    announce_level_up: boolean;
    level_up_channel_id: string | null;
    cooldown_seconds: number;
    boost_multiplier: number;
    boost_starts_at: string | null;
    boost_ends_at: string | null;
    excluded_channel_ids: string[];
    excluded_role_ids: string[];
}

export interface XpRoleBoost {
    guild_id: string;
    role_id: string;
    multiplier: number;
}

const DEFAULT_XP_SETTINGS: Omit<XpSettings, 'guild_id'> = {
    enabled: true,
    announce_level_up: true,
    level_up_channel_id: null,
    cooldown_seconds: XP_COOLDOWN_SECONDS,
    boost_multiplier: 1,
    boost_starts_at: null,
    boost_ends_at: null,
    excluded_channel_ids: [],
    excluded_role_ids: []
};

export function totalXpForLevel(level: number): number {
    return 100 * Math.max(0, level) ** 2;
}

export function levelFromXp(xp: number): number {
    return Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}

export function xpProgress(xp: number): {
    level: number;
    current: number;
    required: number;
    percentage: number;
} {
    const level = levelFromXp(xp);
    const floor = totalXpForLevel(level);
    const ceiling = totalXpForLevel(level + 1);
    const current = xp - floor;
    const required = ceiling - floor;
    return {
        level,
        current,
        required,
        percentage: Math.min(100, Math.floor((current / required) * 100))
    };
}

export function progressBar(percentage: number, size = 12): string {
    const filled = Math.round(Math.max(0, Math.min(100, percentage)) / 100 * size);
    return `${'▰'.repeat(filled)}${'▱'.repeat(size - filled)}`;
}

export async function getXpProfile(guildId: string, userId: string): Promise<XpProfile | null> {
    const { data, error } = await supabase
        .from('guild_xp_profiles')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function getXpLeaderboard(guildId: string, limit = 10): Promise<XpProfile[]> {
    const { data, error } = await supabase
        .from('guild_xp_profiles')
        .select('*')
        .eq('guild_id', guildId)
        .order('xp', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data ?? [];
}

export async function getXpRank(guildId: string, xp: number): Promise<number> {
    const { count, error } = await supabase
        .from('guild_xp_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .gt('xp', xp);
    if (error) throw error;
    return (count ?? 0) + 1;
}

export async function getXpRewards(guildId: string): Promise<XpReward[]> {
    const { data, error } = await supabase
        .from('guild_xp_rewards')
        .select('*')
        .eq('guild_id', guildId)
        .order('level', { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function setXpReward(guildId: string, level: number, roleId: string): Promise<void> {
    const { error } = await supabase
        .from('guild_xp_rewards')
        .upsert({ guild_id: guildId, level, role_id: roleId }, { onConflict: 'guild_id,level' });
    if (error) throw error;
}

export async function deleteXpReward(guildId: string, level: number): Promise<void> {
    const { error } = await supabase
        .from('guild_xp_rewards')
        .delete()
        .eq('guild_id', guildId)
        .eq('level', level);
    if (error) throw error;
}

export async function resetXpProfile(guildId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('guild_xp_profiles')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .select('user_id');
    if (error) throw error;
    return Boolean(data?.length);
}

export async function removeXpRewardRoles(member: GuildMember): Promise<string[]> {
    const rewards = await getXpRewards(member.guild.id);
    const roleIds = rewards
        .map(reward => reward.role_id)
        .filter(roleId => member.roles.cache.has(roleId));
    if (!roleIds.length) return [];

    await member.roles.remove(roleIds, 'Réinitialisation du profil XP');
    return roleIds;
}

export async function updateXpSettings(
    guildId: string,
    updates: Partial<Omit<XpSettings, 'guild_id'>>
): Promise<void> {
    const { error } = await supabase
        .from('guild_xp_settings')
        .upsert(
            { guild_id: guildId, ...updates, updated_at: new Date().toISOString() },
            { onConflict: 'guild_id' }
        );
    if (error) throw error;
    settingsCache.delete(guildId);
}

export async function getXpSettings(guildId: string): Promise<XpSettings> {
    const cached = settingsCache.get(guildId);
    if (cached && cached.expiresAt > Date.now()) return cached.settings;

    const { data, error } = await supabase
        .from('guild_xp_settings')
        .select('*')
        .eq('guild_id', guildId)
        .maybeSingle();
    if (error) throw error;
    const settings = {
        guild_id: guildId,
        ...DEFAULT_XP_SETTINGS,
        ...(data ?? {})
    } as XpSettings;
    settingsCache.set(guildId, { settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL });
    return settings;
}

export async function getXpRoleBoosts(guildId: string): Promise<XpRoleBoost[]> {
    const cached = roleBoostCache.get(guildId);
    if (cached && cached.expiresAt > Date.now()) return cached.boosts;

    const { data, error } = await supabase
        .from('guild_xp_role_boosts')
        .select('*')
        .eq('guild_id', guildId)
        .order('multiplier', { ascending: false });
    if (error) throw error;
    const boosts = data ?? [];
    roleBoostCache.set(guildId, { boosts, expiresAt: Date.now() + SETTINGS_CACHE_TTL });
    return boosts;
}

export async function setXpRoleBoost(guildId: string, roleId: string, multiplier: number): Promise<void> {
    const { error } = await supabase
        .from('guild_xp_role_boosts')
        .upsert({ guild_id: guildId, role_id: roleId, multiplier }, { onConflict: 'guild_id,role_id' });
    if (error) throw error;
    roleBoostCache.delete(guildId);
}

export async function deleteXpRoleBoost(guildId: string, roleId: string): Promise<void> {
    const { error } = await supabase
        .from('guild_xp_role_boosts')
        .delete()
        .eq('guild_id', guildId)
        .eq('role_id', roleId);
    if (error) throw error;
    roleBoostCache.delete(guildId);
}

export async function syncXpRewardRoles(member: GuildMember, level?: number): Promise<string[]> {
    const resolvedLevel = level ?? (await getXpProfile(member.guild.id, member.id))?.level ?? 0;
    const rewards = (await getXpRewards(member.guild.id))
        .filter(reward => reward.level <= resolvedLevel);
    const added: string[] = [];

    for (const reward of rewards) {
        const role = member.guild.roles.cache.get(reward.role_id);
        if (!role || member.roles.cache.has(role.id) || !role.editable) continue;
        try {
            await member.roles.add(role, `Récompense XP niveau ${reward.level}`);
            added.push(role.id);
        } catch (error) {
            logger.warn(`Rôle XP ${role.id} non attribué à ${member.id}`, error, 'XP');
        }
    }
    return added;
}

function randomXpGain(): number {
    return Math.floor(Math.random() * (XP_MAX_GAIN - XP_MIN_GAIN + 1)) + XP_MIN_GAIN;
}

export async function awardMessageXp(message: Message): Promise<void> {
    if (!message.guild || message.author.bot || !message.member) return;
    if (message.content.trim().length < 3 && message.attachments.size === 0) return;
    const settings = await getXpSettings(message.guild.id);
    const channelIds = [
        message.channel.id,
        message.channel.isThread() ? message.channel.parentId : null
    ].filter((id): id is string => Boolean(id));
    if (!settings.enabled || channelIds.some(id => settings.excluded_channel_ids.includes(id))) return;
    if (settings.excluded_role_ids.some(roleId => message.member!.roles.cache.has(roleId))) return;

    const roleBoosts = await getXpRoleBoosts(message.guild.id);
    const roleMultiplier = Math.max(
        1,
        ...roleBoosts
            .filter(boost => message.member!.roles.cache.has(boost.role_id))
            .map(boost => Number(boost.multiplier))
    );
    const now = Date.now();
    const periodBoostActive = Boolean(
        settings.boost_starts_at &&
        settings.boost_ends_at &&
        now >= new Date(settings.boost_starts_at).getTime() &&
        now <= new Date(settings.boost_ends_at).getTime()
    );
    const periodMultiplier = periodBoostActive ? Number(settings.boost_multiplier) : 1;
    const xpGain = Math.max(1, Math.round(randomXpGain() * roleMultiplier * periodMultiplier));

    const { data, error } = await supabase.rpc('add_guild_xp', {
        p_guild_id: message.guild.id,
        p_user_id: message.author.id,
        p_xp: xpGain,
        p_cooldown_seconds: settings.cooldown_seconds
    });
    if (error) throw error;

    const result = data?.[0];
    if (!result || result.level <= result.previous_level) return;

    const addedRoles = await syncXpRewardRoles(message.member, result.level);
    const roleLine = addedRoles.length
        ? `\nRécompense obtenue : ${addedRoles.map((id: string) => `<@&${id}>`).join(', ')}`
        : '';
    if (!settings.announce_level_up) return;
    const embed = setRequesterFooter(
        createKeplerEmbed('success')
            .setTitle(`Niveau ${result.level} atteint`)
            .setDescription(
                `Bravo ${message.author}, tu passes au **niveau ${result.level}**.${roleLine}`
            ),
        message.author,
        'Progression Kepler'
    );
    if (settings.level_up_channel_id && settings.level_up_channel_id !== message.channel.id) {
        try {
            const configuredChannel = await message.guild.channels.fetch(settings.level_up_channel_id);
            if (
                configuredChannel &&
                (configuredChannel.type === ChannelType.GuildText ||
                    configuredChannel.type === ChannelType.GuildAnnouncement)
            ) {
                await configuredChannel.send({ embeds: [embed] });
                return;
            }
            logger.warn('Salon d’annonce XP configuré introuvable ou invalide', undefined, 'XP');
        } catch (error) {
            logger.warn('Envoi dans le salon d’annonce XP impossible, utilisation du salon courant', error, 'XP');
        }
    }
    await message.channel.send({ embeds: [embed] });
}

export function canManageRewardRole(guild: Guild, roleId: string): boolean {
    const role = guild.roles.cache.get(roleId);
    return Boolean(role && role.editable && !role.managed);
}
