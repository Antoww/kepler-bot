import { supabase } from '../../database/supabase.ts';

export type AutoModRule = 'link' | 'invite' | 'spam' | 'duplicate' | 'caps' | 'mentions' | 'keyword';
export type AutoModAction = 'delete' | 'warn' | 'timeout';
export type AutoModSource = 'message_create' | 'message_update' | 'native';

export interface AutoModEscalationStep {
    strikes: number;
    action: AutoModAction;
    timeout_seconds?: number;
}

export interface AutoModSettings {
    guild_id: string;
    enabled: boolean;
    anti_link_enabled: boolean;
    anti_invite_enabled: boolean;
    anti_spam_enabled: boolean;
    anti_duplicate_enabled: boolean;
    anti_caps_enabled: boolean;
    anti_mention_enabled: boolean;
    allow_own_invites: boolean;
    allowed_domains: string[];
    excluded_channel_ids: string[];
    excluded_role_ids: string[];
    spam_message_count: number;
    spam_interval_seconds: number;
    duplicate_message_count: number;
    duplicate_interval_seconds: number;
    caps_percentage: number;
    caps_min_letters: number;
    mention_limit: number;
    action: AutoModAction;
    strike_threshold: number;
    strike_window_seconds: number;
    timeout_seconds: number;
    notify_user: boolean;
    observation_mode: boolean;
    anti_keyword_enabled: boolean;
    blocked_keywords: string[];
    allowed_keywords: string[];
    regex_patterns: string[];
    rule_actions: Partial<Record<AutoModRule, AutoModAction>>;
    escalation_steps: AutoModEscalationStep[];
    anti_raid_enabled: boolean;
    raid_join_count: number;
    raid_interval_seconds: number;
    raid_account_age_hours: number;
    raid_mode_seconds: number;
}

const DEFAULTS: Omit<AutoModSettings, 'guild_id'> = {
    enabled: false,
    anti_link_enabled: false,
    anti_invite_enabled: true,
    anti_spam_enabled: true,
    anti_duplicate_enabled: true,
    anti_caps_enabled: false,
    anti_mention_enabled: true,
    allow_own_invites: true,
    allowed_domains: [],
    excluded_channel_ids: [],
    excluded_role_ids: [],
    spam_message_count: 6,
    spam_interval_seconds: 8,
    duplicate_message_count: 3,
    duplicate_interval_seconds: 30,
    caps_percentage: 75,
    caps_min_letters: 12,
    mention_limit: 5,
    action: 'timeout',
    strike_threshold: 3,
    strike_window_seconds: 3600,
    timeout_seconds: 600,
    notify_user: true,
    observation_mode: false,
    anti_keyword_enabled: false,
    blocked_keywords: [],
    allowed_keywords: [],
    regex_patterns: [],
    rule_actions: {},
    escalation_steps: [],
    anti_raid_enabled: false,
    raid_join_count: 8,
    raid_interval_seconds: 20,
    raid_account_age_hours: 24,
    raid_mode_seconds: 600
};

const cache = new Map<string, { settings: AutoModSettings; expiresAt: number }>();

export async function getAutoModSettings(guildId: string): Promise<AutoModSettings> {
    const cached = cache.get(guildId);
    if (cached && cached.expiresAt > Date.now()) return cached.settings;
    const { data, error } = await supabase
        .from('guild_automod_settings')
        .select('*')
        .eq('guild_id', guildId)
        .maybeSingle();
    if (error) throw new Error(`Lecture de l’auto-modération impossible : ${error.message}`);
    const settings = { guild_id: guildId, ...DEFAULTS, ...(data ?? {}) };
    cache.set(guildId, { settings, expiresAt: Date.now() + 30 * 60_000 });
    return settings;
}

export async function updateAutoModSettings(
    guildId: string,
    patch: Partial<Omit<AutoModSettings, 'guild_id'>>
): Promise<void> {
    const { error } = await supabase.from('guild_automod_settings').upsert({
        guild_id: guildId,
        ...patch,
        updated_at: new Date().toISOString()
    }, { onConflict: 'guild_id' });
    if (error) throw new Error(`Mise à jour de l’auto-modération impossible : ${error.message}`);
    cache.delete(guildId);
}

export async function recordAutoModViolation(
    guildId: string,
    userId: string,
    channelId: string,
    messageId: string,
    rule: AutoModRule,
    actionTaken: string,
    excerpt: string,
    source: AutoModSource = 'message_create',
    observed = false
): Promise<void> {
    const { error } = await supabase.from('guild_automod_violations').insert({
        guild_id: guildId,
        user_id: userId,
        channel_id: channelId,
        message_id: messageId,
        rule,
        action_taken: actionTaken,
        excerpt: excerpt.slice(0, 500),
        source,
        observed
    });
    if (error) throw new Error(`Enregistrement auto-modération impossible : ${error.message}`);
}

export interface AutoModStats {
    total: number;
    observed: number;
    byRule: Partial<Record<AutoModRule, number>>;
}

export async function getAutoModStats(guildId: string, days = 7): Promise<AutoModStats> {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await supabase
        .from('guild_automod_violations')
        .select('rule, observed')
        .eq('guild_id', guildId)
        .gte('created_at', since)
        .limit(5000);
    if (error) throw new Error(`Statistiques auto-modération impossibles : ${error.message}`);
    const rows = (data ?? []) as Array<{ rule: AutoModRule; observed: boolean }>;
    return {
        total: rows.length,
        observed: rows.filter(row => row.observed).length,
        byRule: rows.reduce<Partial<Record<AutoModRule, number>>>((counts, row) => {
            counts[row.rule] = (counts[row.rule] ?? 0) + 1;
            return counts;
        }, {})
    };
}

export async function getAutoModStrikeCount(guildId: string, userId: string): Promise<number> {
    const settings = await getAutoModSettings(guildId);
    const since = new Date(Date.now() - settings.strike_window_seconds * 1000).toISOString();
    const { count, error: countError } = await supabase
        .from('guild_automod_violations')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .gte('created_at', since);
    if (countError) throw new Error(`Comptage des infractions impossible : ${countError.message}`);
    return count ?? 0;
}
