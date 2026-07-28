import { supabase } from './supabase.ts';
import { withNetworkRetry } from '../utils/retryHelper.ts';

// Initialiser la connexion à la base de données avec retry
export async function initDatabase(): Promise<void> {
    // Pour l'instant, on utilise Supabase, donc pas besoin d'initialiser MySQL
    console.log('✅ Base de données (Supabase) prête à être utilisée');
}

// Interface pour les rappels
export interface DatabaseReminder {
    id: number;
    reminder_id: number;
    user_id: string;
    message: string;
    duration_ms: number;
    timestamp: number;
    created_at: Date;
}

// Créer un nouveau rappel
export async function createReminder(reminderId: number, userId: string, message: string, durationMs: number, timestamp: number): Promise<void> {
    const { error } = await supabase
        .from('reminders')
        .insert({
            reminder_id: reminderId,
            user_id: userId,
            message: message,
            duration_ms: durationMs,
            timestamp: timestamp
        });

    if (error) throw error;
}

// Récupérer un rappel par son ID
export async function getReminder(reminderId: number): Promise<DatabaseReminder | null> {
    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('reminder_id', reminderId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Pas trouvé
        throw error;
    }

    return data;
}

// Récupérer tous les rappels d'un utilisateur
export async function getUserReminders(userId: string): Promise<DatabaseReminder[]> {
    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Supprimer un rappel
export async function deleteReminder(reminderId: number): Promise<void> {
    const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('reminder_id', reminderId);

    if (error) throw error;
}

// Récupérer tous les rappels expirés
export async function getExpiredReminders(): Promise<DatabaseReminder[]> {
    return withNetworkRetry(async () => {
        const currentTime = Date.now();
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .lte('timestamp', currentTime)
            .order('timestamp', { ascending: true });

        if (error) throw error;
        return data || [];
    }, 'récupération des rappels expirés');
}

// Interface pour les anniversaires
export interface Birthday {
    id: number;
    guild_id: string;
    user_id: string;
    birth_day: number;
    birth_month: number;
    birth_year?: number;
    created_at: Date;
    updated_at: Date;
}

// Interface pour les configurations de serveur
export interface ServerConfig {
    guild_id: string;
    log_channel_id: string;
    birthday_channel_id?: string;
    report_channel_id?: string;
    report_role_id?: string;
    ticket_panel_channel_id?: string;
    ticket_category_id?: string;
    ticket_support_role_id?: string;
    ticket_panel_title?: string;
    ticket_panel_message?: string;
    ticket_button_label?: string;
    ticket_button_emoji?: string;
    ticket_button_style?: string;
    created_at: Date;
    updated_at: Date;
}

export interface TicketConfig {
    guild_id: string;
    ticket_panel_channel_id: string | null;
    ticket_category_id: string | null;
    ticket_support_role_id: string | null;
    ticket_panel_title: string;
    ticket_panel_message: string;
    ticket_button_label: string;
    ticket_button_emoji: string | null;
    ticket_button_style: string;
}

const DEFAULT_TICKET_CONFIG = {
    ticket_panel_title: 'Besoin d’aide ?',
    ticket_panel_message: 'Cliquez sur le bouton ci-dessous pour ouvrir un ticket privé avec l’équipe du serveur.',
    ticket_button_label: 'Ouvrir un ticket',
    ticket_button_emoji: '🎫',
    ticket_button_style: 'Primary'
} as const;

export async function getTicketConfig(guildId: string): Promise<TicketConfig> {
    const { data, error } = await supabase
        .from('server_configs')
        .select('guild_id, ticket_panel_channel_id, ticket_category_id, ticket_support_role_id, ticket_panel_title, ticket_panel_message, ticket_button_label, ticket_button_emoji, ticket_button_style')
        .eq('guild_id', guildId)
        .maybeSingle();

    if (error) throw error;
    return {
        guild_id: guildId,
        ticket_panel_channel_id: data?.ticket_panel_channel_id ?? null,
        ticket_category_id: data?.ticket_category_id ?? null,
        ticket_support_role_id: data?.ticket_support_role_id ?? null,
        ticket_panel_title: data?.ticket_panel_title || DEFAULT_TICKET_CONFIG.ticket_panel_title,
        ticket_panel_message: data?.ticket_panel_message || DEFAULT_TICKET_CONFIG.ticket_panel_message,
        ticket_button_label: data?.ticket_button_label || DEFAULT_TICKET_CONFIG.ticket_button_label,
        ticket_button_emoji: data?.ticket_button_emoji ?? DEFAULT_TICKET_CONFIG.ticket_button_emoji,
        ticket_button_style: data?.ticket_button_style || DEFAULT_TICKET_CONFIG.ticket_button_style
    };
}

export async function updateTicketConfig(
    guildId: string,
    values: Partial<Omit<TicketConfig, 'guild_id'>>
): Promise<void> {
    const { error } = await supabase
        .from('server_configs')
        .upsert({
            guild_id: guildId,
            ...values,
            updated_at: new Date().toISOString()
        }, { onConflict: 'guild_id' });

    if (error) throw error;
}

// Mettre à jour le canal de logs d'un serveur
export async function updateLogChannel(guildId: string, channelId: string): Promise<void> {
    // D'abord, vérifier si une configuration existe déjà
    const { data: existingConfig } = await supabase
        .from('server_configs')
        .select('id, birthday_channel_id')
        .eq('guild_id', guildId)
        .single();

    if (existingConfig) {
        // Mettre à jour la configuration existante
        const { error } = await supabase
            .from('server_configs')
            .update({
                log_channel_id: channelId,
                updated_at: new Date().toISOString()
            })
            .eq('guild_id', guildId);

        if (error) throw error;
    } else {
        // Créer une nouvelle configuration
        const { error } = await supabase
            .from('server_configs')
            .insert({
                guild_id: guildId,
                log_channel_id: channelId,
                birthday_channel_id: null, // Explicitement null
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    }
}

// Mettre à jour le canal d'anniversaires d'un serveur
export async function updateBirthdayChannel(guildId: string, channelId: string): Promise<void> {
    // D'abord, vérifier si une configuration existe déjà
    const { data: existingConfig } = await supabase
        .from('server_configs')
        .select('id, log_channel_id')
        .eq('guild_id', guildId)
        .single();

    if (existingConfig) {
        // Mettre à jour la configuration existante
        const { error } = await supabase
            .from('server_configs')
            .update({
                birthday_channel_id: channelId,
                updated_at: new Date().toISOString()
            })
            .eq('guild_id', guildId);

        if (error) throw error;
    } else {
        // Créer une nouvelle configuration
        const { error } = await supabase
            .from('server_configs')
            .insert({
                guild_id: guildId,
                birthday_channel_id: channelId,
                log_channel_id: null, // Explicitement null
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    }
}

// Récupérer le canal de logs d'un serveur
export async function getLogChannel(guildId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('server_configs')
        .select('log_channel_id')
        .eq('guild_id', guildId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Pas trouvé
        throw error;
    }

    return data?.log_channel_id || null;
}

// Récupérer le canal d'anniversaires d'un serveur
export async function getBirthdayChannel(guildId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('server_configs')
        .select('birthday_channel_id')
        .eq('guild_id', guildId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Pas trouvé
        throw error;
    }

    return data?.birthday_channel_id || null;
}

// Ajouter ou mettre à jour un anniversaire
export async function setBirthday(guildId: string, userId: string, day: number, month: number, year?: number): Promise<void> {
    const { error } = await supabase
        .from('birthdays')
        .upsert({
            guild_id: guildId,
            user_id: userId,
            birth_day: day,
            birth_month: month,
            birth_year: year || null,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'guild_id,user_id'
        });

    if (error) throw error;
}

// Récupérer un anniversaire
export async function getBirthday(guildId: string, userId: string): Promise<Birthday | null> {
    const { data, error } = await supabase
        .from('birthdays')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Pas trouvé
        throw error;
    }

    return data;
}

// Récupérer tous les anniversaires d'un serveur pour un jour/mois donné
export async function getBirthdaysForDate(guildId: string, day: number, month: number): Promise<Birthday[]> {
    return withNetworkRetry(async () => {
        const { data, error } = await supabase
            .from('birthdays')
            .select('*')
            .eq('guild_id', guildId)
            .eq('birth_day', day)
            .eq('birth_month', month);

        if (error) throw error;
        return data || [];
    }, 'récupération des anniversaires');
}

// Supprimer un anniversaire
export async function deleteBirthday(guildId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('birthdays')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', userId);

    if (error) throw error;
}

// Récupérer tous les anniversaires d'un serveur
export async function getAllBirthdays(guildId: string): Promise<Birthday[]> {
    const { data, error } = await supabase
        .from('birthdays')
        .select('*')
        .eq('guild_id', guildId)
        .order('birth_month', { ascending: true })
        .order('birth_day', { ascending: true });

    if (error) throw error;
    return data || [];
}

// Mettre à jour le canal de modération d'un serveur
export async function updateModerationChannel(guildId: string, channelId: string): Promise<void> {
    // D'abord, vérifier si une configuration existe déjà
    const { data: existingConfig } = await supabase
        .from('server_configs')
        .select('id, log_channel_id, birthday_channel_id')
        .eq('guild_id', guildId)
        .single();

    if (existingConfig) {
        // Mettre à jour la configuration existante
        const { error } = await supabase
            .from('server_configs')
            .update({
                moderation_channel_id: channelId,
                updated_at: new Date().toISOString()
            })
            .eq('guild_id', guildId);

        if (error) throw error;
    } else {
        // Créer une nouvelle configuration
        const { error } = await supabase
            .from('server_configs')
            .insert({
                guild_id: guildId,
                log_channel_id: null,
                birthday_channel_id: null,
                moderation_channel_id: channelId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    }
}

// Récupérer le canal de modération d'un serveur
export async function getModerationChannel(guildId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('server_configs')
        .select('moderation_channel_id')
        .eq('guild_id', guildId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Pas trouvé
        throw error;
    }

    return data?.moderation_channel_id || null;
}

export async function updateReportChannel(guildId: string, channelId: string): Promise<void> {
    const { error } = await supabase
        .from('server_configs')
        .upsert({
            guild_id: guildId,
            report_channel_id: channelId || null,
            updated_at: new Date().toISOString()
        }, { onConflict: 'guild_id' });

    if (error) throw error;
}

export async function getReportChannel(guildId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('server_configs')
        .select('report_channel_id')
        .eq('guild_id', guildId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data?.report_channel_id || null;
}

export async function updateReportRole(guildId: string, roleId: string): Promise<void> {
    const { error } = await supabase
        .from('server_configs')
        .upsert({
            guild_id: guildId,
            report_role_id: roleId || null,
            updated_at: new Date().toISOString()
        }, { onConflict: 'guild_id' });

    if (error) throw error;
}

export async function getReportRole(guildId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('server_configs')
        .select('report_role_id')
        .eq('guild_id', guildId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data?.report_role_id || null;
}

export interface QuizScore {
    scope_id: string;
    user_id: string;
    current_streak: number;
    best_streak: number;
    total_correct: number;
    total_answers: number;
    updated_at: string;
}

export async function getQuizScore(scopeId: string, userId: string): Promise<QuizScore | null> {
    const { data, error } = await supabase
        .from('quiz_scores')
        .select('*')
        .eq('scope_id', scopeId)
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data;
}

export async function getQuizLeaderboard(scopeId: string, limit = 10): Promise<QuizScore[]> {
    const { data, error } = await supabase
        .from('quiz_scores')
        .select('*')
        .eq('scope_id', scopeId)
        .order('best_streak', { ascending: false })
        .order('total_correct', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

export async function recordQuizAnswer(guildId: string, userId: string, correct: boolean): Promise<{ server: QuizScore; global: QuizScore }> {
    const scopes = [guildId, 'global'];
    const { data: currentScores, error: readError } = await supabase
        .from('quiz_scores')
        .select('*')
        .eq('user_id', userId)
        .in('scope_id', scopes);

    if (readError) throw readError;
    const currentByScope = new Map((currentScores || []).map(score => [score.scope_id, score as QuizScore]));
    const scores = scopes.map(scopeId => {
        const current = currentByScope.get(scopeId);
        const currentStreak = correct ? (current?.current_streak ?? 0) + 1 : 0;
        return {
            scope_id: scopeId,
            user_id: userId,
            current_streak: currentStreak,
            best_streak: Math.max(current?.best_streak ?? 0, currentStreak),
            total_correct: (current?.total_correct ?? 0) + (correct ? 1 : 0),
            total_answers: (current?.total_answers ?? 0) + 1,
            updated_at: new Date().toISOString()
        };
    });
    const { data, error } = await supabase
        .from('quiz_scores')
        .upsert(scores, { onConflict: 'scope_id,user_id' })
        .select();

    if (error) throw error;
    const server = data?.find(score => score.scope_id === guildId) as QuizScore | undefined;
    const global = data?.find(score => score.scope_id === 'global') as QuizScore | undefined;
    if (!server || !global) throw new Error('Impossible de mettre à jour les scores du quiz');
    return { server, global };
}

// Interface pour les sanctions temporaires
export interface TempBan {
    id: number;
    guild_id: string;
    user_id: string;
    moderator_id: string;
    reason: string;
    end_time: Date;
    created_at: Date;
}

export interface TempMute {
    id: number;
    guild_id: string;
    user_id: string;
    moderator_id: string;
    reason: string;
    end_time: Date;
    created_at: Date;
}

// Créer un ban temporaire
export async function createTempBan(guildId: string, userId: string, moderatorId: string, reason: string, endTime: Date): Promise<void> {
    const { error } = await supabase
        .from('temp_bans')
        .insert({
            guild_id: guildId,
            user_id: userId,
            moderator_id: moderatorId,
            reason: reason,
            end_time: endTime.toISOString(),
            created_at: new Date().toISOString()
        });

    if (error) throw error;
}

// Créer un mute temporaire
export async function createTempMute(guildId: string, userId: string, moderatorId: string, reason: string, endTime: Date): Promise<void> {
    const { error } = await supabase
        .from('temp_mutes')
        .insert({
            guild_id: guildId,
            user_id: userId,
            moderator_id: moderatorId,
            reason: reason,
            end_time: endTime.toISOString(),
            created_at: new Date().toISOString()
        });

    if (error) throw error;
}

// Récupérer les bans temporaires expirés
export async function getExpiredTempBans(): Promise<TempBan[]> {
    return withNetworkRetry(async () => {
        const { data, error } = await supabase
            .from('temp_bans')
            .select('*')
            .lt('end_time', new Date().toISOString());

        if (error) throw error;
        return data || [];
    }, 'récupération des bans temporaires expirés');
}

// Récupérer les mutes temporaires expirés
export async function getExpiredTempMutes(): Promise<TempMute[]> {
    return withNetworkRetry(async () => {
        const { data, error } = await supabase
            .from('temp_mutes')
            .select('*')
            .lt('end_time', new Date().toISOString());

        if (error) throw error;
        return data || [];
    }, 'récupération des mutes temporaires expirés');
}

// Supprimer un ban temporaire
export async function removeTempBan(id: number): Promise<void> {
    const { error } = await supabase
        .from('temp_bans')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Supprimer un mute temporaire
export async function removeTempMute(id: number): Promise<void> {
    const { error } = await supabase
        .from('temp_mutes')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Interface pour l'historique de modération
export interface ModerationHistoryEntry {
    id: number;
    guild_id: string;
    user_id: string;
    moderator_id: string;
    action_type: string;
    reason: string;
    duration?: string;
    sanction_number?: number;
    created_at: Date;
}

// Interface pour les warnings
export interface Warning {
    id: number;
    guild_id: string;
    user_id: string;
    moderator_id: string;
    reason: string;
    sanction_number: number;
    created_at: Date;
}

// Obtenir le prochain numéro de sanction pour un serveur
export async function getNextSanctionNumber(guildId: string): Promise<number> {
    const { data, error } = await supabase
        .rpc('get_next_sanction_number', { p_guild_id: guildId });

    if (error) throw error;
    return data;
}

// Ajouter une entrée à l'historique de modération avec numéro de sanction
export async function addModerationHistory(
    guildId: string,
    userId: string,
    moderatorId: string,
    actionType: string,
    reason: string,
    duration?: string,
    existingSanctionNumber?: number
): Promise<number> {
    const sanctionNumber = existingSanctionNumber ?? await getNextSanctionNumber(guildId);

    const { error } = await supabase
        .from('moderation_history')
        .insert({
            guild_id: guildId,
            user_id: userId,
            moderator_id: moderatorId,
            action_type: actionType,
            reason: reason,
            duration: duration,
            sanction_number: sanctionNumber,
            created_at: new Date().toISOString()
        });

    if (error) throw error;
    return sanctionNumber;
}

// Créer un warning
export async function createWarning(guildId: string, userId: string, moderatorId: string, reason: string): Promise<number> {
    // Obtenir le numéro de sanction
    const sanctionNumber = await getNextSanctionNumber(guildId);

    const { error } = await supabase
        .from('warnings')
        .insert({
            guild_id: guildId,
            user_id: userId,
            moderator_id: moderatorId,
            reason: reason,
            sanction_number: sanctionNumber,
            created_at: new Date().toISOString()
        });

    if (error) throw error;
    return sanctionNumber;
}

// Récupérer les warnings d'un utilisateur
export async function getUserWarnings(guildId: string, userId: string): Promise<Warning[]> {
    const { data, error } = await supabase
        .from('warnings')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// Supprimer un warning par numéro de sanction
export async function removeWarningBySanctionNumber(guildId: string, sanctionNumber: number): Promise<boolean> {
    const { data, error } = await supabase
        .from('warnings')
        .delete()
        .eq('guild_id', guildId)
        .eq('sanction_number', sanctionNumber);

    if (error) throw error;
    return data !== null;
}

// Récupérer l'historique de modération d'un utilisateur
export async function getModerationHistory(guildId: string, userId: string, limit: number = 10): Promise<ModerationHistoryEntry[]> {
    const { data, error } = await supabase
        .from('moderation_history')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// Récupérer un ban temporaire actif
export async function getActiveTempBan(guildId: string, userId: string): Promise<TempBan | null> {
    const { data, error } = await supabase
        .from('temp_bans')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .gt('end_time', new Date().toISOString())
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Pas trouvé
        throw error;
    }
    return data;
}

// Récupérer un mute temporaire actif
export async function getActiveTempMute(guildId: string, userId: string): Promise<TempMute | null> {
    const { data, error } = await supabase
        .from('temp_mutes')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .gt('end_time', new Date().toISOString())
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Pas trouvé
        throw error;
    }
    return data;
}

// Mettre à jour le rôle de mute d'un serveur
export async function updateMuteRole(guildId: string, roleId: string): Promise<void> {
    // D'abord, vérifier si une configuration existe déjà
    const { data: existingConfig } = await supabase
        .from('server_configs')
        .select('id, log_channel_id, birthday_channel_id, moderation_channel_id')
        .eq('guild_id', guildId)
        .single();

    if (existingConfig) {
        // Mettre à jour la configuration existante
        const { error } = await supabase
            .from('server_configs')
            .update({
                mute_role_id: roleId,
                updated_at: new Date().toISOString()
            })
            .eq('guild_id', guildId);

        if (error) throw error;
    } else {
        // Créer une nouvelle configuration
        const { error } = await supabase
            .from('server_configs')
            .insert({
                guild_id: guildId,
                log_channel_id: null,
                birthday_channel_id: null,
                moderation_channel_id: null,
                mute_role_id: roleId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    }
}

// Récupérer le rôle de mute d'un serveur
export async function getMuteRole(guildId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('server_configs')
        .select('mute_role_id')
        .eq('guild_id', guildId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Pas trouvé
        throw error;
    }

    return data?.mute_role_id || null;
}

// Fermer la connexion à la base de données
export async function closeDatabase(): Promise<void> {
    // Avec Supabase, pas besoin de fermer explicitement la connexion
    console.log('🔌 Connexion Supabase fermée');
}

// Interface pour les giveaways
export interface Giveaway {
    id: string;
    guild_id: string;
    channel_id: string;
    message_id: string;
    title: string;
    quantity: number;
    reward: string;
    role_id?: string;
    winner_role_id?: string;
    end_time: Date;
    created_at: Date;
    ended: boolean;
}

// Interface pour les participants au giveaway
export interface GiveawayParticipant {
    id: number;
    giveaway_id: string;
    user_id: string;
    created_at: Date;
}

// Créer un giveaway
export async function createGiveaway(
    giveawayId: string,
    guildId: string,
    channelId: string,
    messageId: string,
    title: string,
    quantity: number,
    reward: string,
    roleId: string | undefined,
    endTime: Date,
    winnerRoleId?: string
): Promise<void> {
    const { error } = await supabase
        .from('giveaways')
        .insert({
            id: giveawayId,
            guild_id: guildId,
            channel_id: channelId,
            message_id: messageId,
            title: title,
            quantity: quantity,
            reward: reward,
            role_id: roleId || null,
            winner_role_id: winnerRoleId || null,
            end_time: endTime.toISOString(),
            created_at: new Date().toISOString(),
            ended: false
        });

    if (error) throw error;
}

// Récupérer un giveaway par son ID
export async function getGiveaway(giveawayId: string): Promise<Giveaway | null> {
    const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('id', giveawayId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    return data;
}

// Récupérer tous les giveaways actifs d'une guild
export async function getActiveGiveaways(guildId: string): Promise<Giveaway[]> {
    const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('guild_id', guildId)
        .eq('ended', false)
        .gt('end_time', new Date().toISOString());

    if (error) throw error;
    return data || [];
}

// Récupérer les giveaways expirés
export async function getExpiredGiveaways(): Promise<Giveaway[]> {
    return withNetworkRetry(async () => {
        const { data, error } = await supabase
            .from('giveaways')
            .select('*')
            .eq('ended', false)
            .lt('end_time', new Date().toISOString());

        if (error) throw error;
        return data || [];
    }, 'récupération des giveaways expirés');
}

// Marquer un giveaway comme terminé
export async function endGiveaway(giveawayId: string): Promise<void> {
    const { error } = await supabase
        .from('giveaways')
        .update({
            ended: true,
            updated_at: new Date().toISOString()
        })
        .eq('id', giveawayId);

    if (error) throw error;
}

// Supprimer un giveaway
export async function deleteGiveaway(giveawayId: string): Promise<void> {
    const { error } = await supabase
        .from('giveaways')
        .delete()
        .eq('id', giveawayId);

    if (error) throw error;
}

// Ajouter un participant au giveaway
export async function addGiveawayParticipant(giveawayId: string, userId: string): Promise<boolean> {
    const { data: existing, error: checkError } = await supabase
        .from('giveaway_participants')
        .select('id')
        .eq('giveaway_id', giveawayId)
        .eq('user_id', userId)
        .single();

    // Si le participant existe déjà, retourner false
    if (existing) return false;

    const { error } = await supabase
        .from('giveaway_participants')
        .insert({
            giveaway_id: giveawayId,
            user_id: userId,
            created_at: new Date().toISOString()
        });

    if (error) throw error;
    return true;
}

// Retirer un participant du giveaway
export async function removeGiveawayParticipant(giveawayId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('giveaway_participants')
        .delete()
        .eq('giveaway_id', giveawayId)
        .eq('user_id', userId);

    if (error) throw error;
    return true;
}

// Vérifier si un utilisateur participe à un giveaway
export async function isParticipant(giveawayId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('giveaway_participants')
        .select('id')
        .eq('giveaway_id', giveawayId)
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return false;
        throw error;
    }

    return !!data;
}

// Récupérer tous les participants d'un giveaway
export async function getGiveawayParticipants(giveawayId: string): Promise<GiveawayParticipant[]> {
    const { data, error } = await supabase
        .from('giveaway_participants')
        .select('*')
        .eq('giveaway_id', giveawayId);

    if (error) throw error;
    return data || [];
}

// Récupérer le nombre de participants d'un giveaway
export async function getGiveawayParticipantCount(giveawayId: string): Promise<number> {
    const { count, error } = await supabase
        .from('giveaway_participants')
        .select('*', { count: 'exact', head: true })
        .eq('giveaway_id', giveawayId);

    if (error) throw error;
    return count || 0;
}

// Mettre à jour le rôle de récompense d'un giveaway
export async function updateGiveawayWinnerRole(giveawayId: string, winnerRoleId: string | null): Promise<void> {
    const { error } = await supabase
        .from('giveaways')
        .update({
            winner_role_id: winnerRoleId,
            updated_at: new Date().toISOString()
        })
        .eq('id', giveawayId);

    if (error) throw error;
}
