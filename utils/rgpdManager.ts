import { supabase } from '../database/supabase.ts';
import { logger } from './logger.ts';

// ============================================
// Module RGPD - Gestion complète des données utilisateur
// ============================================

/**
 * Structure complète des données utilisateur pour le RGPD
 */
export interface UserDataComplete {
    userId: string;
    exportDate: string;
    // Statistiques d'utilisation
    stats: {
        commands: Array<{
            command_name: string;
            guild_id: string;
            executed_at: string;
            success: boolean;
        }>;
        messages: Array<{
            guild_id: string;
            channel_id: string;
            message_date: string;
            message_count: number;
        }>;
    };
    // Données personnelles
    personal: {
        birthdays: Array<{
            guild_id: string;
            birth_day: number;
            birth_month: number;
            birth_year?: number;
            created_at: string;
        }>;
        reminders: Array<{
            message: string;
            timestamp: number;
            created_at: string;
        }>;
    };
    // Données de modération
    moderation: {
        warnings: Array<{
            guild_id: string;
            moderator_id: string;
            reason: string;
            sanction_number: number;
            created_at: string;
        }>;
        history: Array<{
            guild_id: string;
            action_type: string;
            reason: string;
            duration?: string;
            sanction_number?: number;
            created_at: string;
        }>;
        tempBans: Array<{
            guild_id: string;
            reason: string;
            end_time: string;
            created_at: string;
        }>;
        tempMutes: Array<{
            guild_id: string;
            reason: string;
            end_time: string;
            created_at: string;
        }>;
    };
    // Participations
    participations: {
        giveaways: Array<{
            giveaway_id: string;
            created_at: string;
        }>;
    };
}

/**
 * Résumé des données utilisateur
 */
export interface UserDataSummary {
    // Statistiques
    commandCount: number;
    messageCount: number;
    // Données personnelles
    birthdayCount: number;
    reminderCount: number;
    // Modération
    warningCount: number;
    moderationHistoryCount: number;
    activeTempBans: number;
    activeTempMutes: number;
    // Participations
    giveawayParticipations: number;
    // Métadonnées
    firstActivity: string | null;
    lastActivity: string | null;
    guilds: string[];
}

/**
 * Résultat de suppression
 */
export interface DeletionResult {
    commandsDeleted: number;
    messagesDeleted: number;
    birthdaysDeleted: number;
    remindersDeleted: number;
    warningsDeleted: number;
    moderationHistoryDeleted: number;
    tempBansDeleted: number;
    tempMutesDeleted: number;
    giveawayParticipationsDeleted: number;
}

// ============================================
// Fonctions de récupération des données
// ============================================

/**
 * Récupère un résumé complet des données d'un utilisateur
 */
export async function getCompleteUserDataSummary(userId: string): Promise<UserDataSummary> {
    // Récupérer toutes les données en parallèle
    const [
        commandData,
        messageData,
        birthdayData,
        reminderData,
        warningData,
        moderationData,
        tempBanData,
        tempMuteData,
        giveawayData
    ] = await Promise.all([
        // Stats
        supabase.from('command_stats').select('guild_id, executed_at').eq('user_id', userId).order('executed_at', { ascending: true }),
        supabase.from('message_stats').select('guild_id, message_date, message_count').eq('user_id', userId).order('message_date', { ascending: true }),
        // Personnel
        supabase.from('birthdays').select('guild_id').eq('user_id', userId),
        supabase.from('reminders').select('created_at').eq('user_id', userId),
        // Modération
        supabase.from('warnings').select('guild_id, created_at').eq('user_id', userId),
        supabase.from('moderation_history').select('guild_id, created_at').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('temp_bans').select('guild_id').eq('user_id', userId),
        supabase.from('temp_mutes').select('guild_id').eq('user_id', userId),
        // Participations
        supabase.from('giveaway_participants').select('created_at').eq('user_id', userId)
    ]);

    // Calculer les compteurs
    const commandCount = commandData.data?.length || 0;
    const messageCount = (messageData.data || []).reduce((sum, row) => sum + row.message_count, 0);
    const birthdayCount = birthdayData.data?.length || 0;
    const reminderCount = reminderData.data?.length || 0;
    const warningCount = warningData.data?.length || 0;
    const moderationHistoryCount = moderationData.data?.length || 0;
    const activeTempBans = tempBanData.data?.length || 0;
    const activeTempMutes = tempMuteData.data?.length || 0;
    const giveawayParticipations = giveawayData.data?.length || 0;

    // Collecter les guilds uniques
    const guildsSet = new Set<string>();
    commandData.data?.forEach(row => guildsSet.add(row.guild_id));
    messageData.data?.forEach(row => guildsSet.add(row.guild_id));
    birthdayData.data?.forEach(row => guildsSet.add(row.guild_id));
    warningData.data?.forEach(row => guildsSet.add(row.guild_id));
    moderationData.data?.forEach(row => guildsSet.add(row.guild_id));
    tempBanData.data?.forEach(row => guildsSet.add(row.guild_id));
    tempMuteData.data?.forEach(row => guildsSet.add(row.guild_id));

    // Déterminer les dates d'activité
    let firstActivity: string | null = null;
    let lastActivity: string | null = null;

    const allDates: string[] = [];
    if (commandData.data?.length) {
        allDates.push(commandData.data[0].executed_at);
        allDates.push(commandData.data[commandData.data.length - 1].executed_at);
    }
    if (messageData.data?.length) {
        allDates.push(messageData.data[0].message_date);
        allDates.push(messageData.data[messageData.data.length - 1].message_date);
    }
    if (moderationData.data?.length) {
        allDates.push(moderationData.data[0].created_at);
        allDates.push(moderationData.data[moderationData.data.length - 1].created_at);
    }

    if (allDates.length > 0) {
        allDates.sort();
        firstActivity = allDates[0];
        lastActivity = allDates[allDates.length - 1];
    }

    return {
        commandCount,
        messageCount,
        birthdayCount,
        reminderCount,
        warningCount,
        moderationHistoryCount,
        activeTempBans,
        activeTempMutes,
        giveawayParticipations,
        firstActivity,
        lastActivity,
        guilds: Array.from(guildsSet)
    };
}

/**
 * Exporte toutes les données d'un utilisateur (RGPD - Droit à la portabilité)
 */
export async function exportCompleteUserData(userId: string): Promise<UserDataComplete> {
    const [
        commandData,
        messageData,
        birthdayData,
        reminderData,
        warningData,
        moderationData,
        tempBanData,
        tempMuteData,
        giveawayData
    ] = await Promise.all([
        // Stats (sans l'ID utilisateur dans l'export, déjà connu)
        supabase.from('command_stats').select('command_name, guild_id, executed_at, success').eq('user_id', userId),
        supabase.from('message_stats').select('guild_id, channel_id, message_date, message_count').eq('user_id', userId),
        // Personnel
        supabase.from('birthdays').select('guild_id, birth_day, birth_month, birth_year, created_at').eq('user_id', userId),
        supabase.from('reminders').select('message, timestamp, created_at').eq('user_id', userId),
        // Modération (on inclut le moderator_id car c'est une information pertinente pour l'utilisateur)
        supabase.from('warnings').select('guild_id, moderator_id, reason, sanction_number, created_at').eq('user_id', userId),
        supabase.from('moderation_history').select('guild_id, action_type, reason, duration, sanction_number, created_at').eq('user_id', userId),
        supabase.from('temp_bans').select('guild_id, reason, end_time, created_at').eq('user_id', userId),
        supabase.from('temp_mutes').select('guild_id, reason, end_time, created_at').eq('user_id', userId),
        // Participations
        supabase.from('giveaway_participants').select('giveaway_id, created_at').eq('user_id', userId)
    ]);

    return {
        userId,
        exportDate: new Date().toISOString(),
        stats: {
            commands: commandData.data || [],
            messages: messageData.data || []
        },
        personal: {
            birthdays: birthdayData.data || [],
            reminders: reminderData.data || []
        },
        moderation: {
            warnings: warningData.data || [],
            history: moderationData.data || [],
            tempBans: tempBanData.data || [],
            tempMutes: tempMuteData.data || []
        },
        participations: {
            giveaways: giveawayData.data || []
        }
    };
}

// ============================================
// Fonctions de suppression des données
// ============================================

/**
 * Options de suppression sélective
 */
export interface DeletionOptions {
    stats?: boolean;           // command_stats, message_stats
    personal?: boolean;        // birthdays, reminders
    moderation?: boolean;      // warnings, moderation_history, temp_bans, temp_mutes
    participations?: boolean;  // giveaway_participants
}

/**
 * Supprime toutes les données d'un utilisateur (RGPD - Droit à l'effacement)
 * Note: Les données de modération ne peuvent pas être supprimées par l'utilisateur
 * car elles servent à la sécurité du serveur
 */
export async function deleteCompleteUserData(
    userId: string, 
    options: DeletionOptions = { stats: true, personal: true, participations: true }
): Promise<DeletionResult> {
    const result: DeletionResult = {
        commandsDeleted: 0,
        messagesDeleted: 0,
        birthdaysDeleted: 0,
        remindersDeleted: 0,
        warningsDeleted: 0,
        moderationHistoryDeleted: 0,
        tempBansDeleted: 0,
        tempMutesDeleted: 0,
        giveawayParticipationsDeleted: 0
    };

    // Supprimer les statistiques
    if (options.stats) {
        const [commands, messages] = await Promise.all([
            supabase.from('command_stats').delete().eq('user_id', userId).select('id'),
            supabase.from('message_stats').delete().eq('user_id', userId).select('id')
        ]);
        result.commandsDeleted = commands.data?.length || 0;
        result.messagesDeleted = messages.data?.length || 0;
    }

    // Supprimer les données personnelles
    if (options.personal) {
        const [birthdays, reminders] = await Promise.all([
            supabase.from('birthdays').delete().eq('user_id', userId).select('id'),
            supabase.from('reminders').delete().eq('user_id', userId).select('id')
        ]);
        result.birthdaysDeleted = birthdays.data?.length || 0;
        result.remindersDeleted = reminders.data?.length || 0;
    }

    // Supprimer les données de modération (optionnel - généralement non autorisé)
    if (options.moderation) {
        const [warnings, history, bans, mutes] = await Promise.all([
            supabase.from('warnings').delete().eq('user_id', userId).select('id'),
            supabase.from('moderation_history').delete().eq('user_id', userId).select('id'),
            supabase.from('temp_bans').delete().eq('user_id', userId).select('id'),
            supabase.from('temp_mutes').delete().eq('user_id', userId).select('id')
        ]);
        result.warningsDeleted = warnings.data?.length || 0;
        result.moderationHistoryDeleted = history.data?.length || 0;
        result.tempBansDeleted = bans.data?.length || 0;
        result.tempMutesDeleted = mutes.data?.length || 0;
    }

    // Supprimer les participations
    if (options.participations) {
        const giveaways = await supabase
            .from('giveaway_participants')
            .delete()
            .eq('user_id', userId)
            .select('id');
        result.giveawayParticipationsDeleted = giveaways.data?.length || 0;
    }

    logger.info(`Données utilisateur supprimées: ${userId}`, result, 'RGPD');
    return result;
}

/**
 * Supprime uniquement les données volontaires de l'utilisateur
 * (statistiques, anniversaires, rappels, participations)
 * Les données de modération sont conservées pour la sécurité
 */
export async function deleteVoluntaryUserData(userId: string): Promise<DeletionResult> {
    return await deleteCompleteUserData(userId, {
        stats: true,
        personal: true,
        participations: true,
        moderation: false // Les sanctions restent pour la sécurité
    });
}

// ============================================
// Fonctions de purge automatique
// ============================================

/**
 * Purge les données anciennes de toutes les tables
 * Respecte des délais différents selon le type de données
 */
export async function purgeAllOldData(): Promise<{
    stats: { commands: number; messages: number; daily: number };
    personal: { reminders: number };
    moderation: { history: number; tempBans: number; tempMutes: number };
}> {
    const now = new Date();
    
    // Dates de coupure selon le type de données
    const statsRetention = new Date(now);
    statsRetention.setDate(statsRetention.getDate() - 90); // 90 jours pour les stats
    
    const moderationRetention = new Date(now);
    moderationRetention.setFullYear(moderationRetention.getFullYear() - 2); // 2 ans pour la modération
    
    const statsDate = statsRetention.toISOString();
    const statsDateOnly = statsRetention.toISOString().split('T')[0];
    const modDate = moderationRetention.toISOString();

    // Purge des statistiques (90 jours)
    const [commands, messages, daily, globalDaily] = await Promise.all([
        supabase.from('command_stats').delete().lt('executed_at', statsDate).select('id'),
        supabase.from('message_stats').delete().lt('message_date', statsDateOnly).select('id'),
        supabase.from('daily_stats').delete().lt('stat_date', statsDateOnly).select('id'),
        supabase.from('global_daily_stats').delete().lt('stat_date', statsDateOnly).select('id')
    ]);

    // Purge des rappels expirés (déjà déclenchés, on peut les supprimer)
    const reminders = await supabase
        .from('reminders')
        .delete()
        .lt('timestamp', Date.now() - 7 * 24 * 60 * 60 * 1000) // Rappels expirés depuis 7 jours
        .select('id');

    // Purge de l'historique de modération ancien (2 ans)
    const [modHistory, tempBans, tempMutes] = await Promise.all([
        supabase.from('moderation_history').delete().lt('created_at', modDate).select('id'),
        supabase.from('temp_bans').delete().lt('end_time', now.toISOString()).select('id'), // Bans expirés
        supabase.from('temp_mutes').delete().lt('end_time', now.toISOString()).select('id') // Mutes expirés
    ]);

    const result = {
        stats: {
            commands: commands.data?.length || 0,
            messages: messages.data?.length || 0,
            daily: (daily.data?.length || 0) + (globalDaily.data?.length || 0)
        },
        personal: {
            reminders: reminders.data?.length || 0
        },
        moderation: {
            history: modHistory.data?.length || 0,
            tempBans: tempBans.data?.length || 0,
            tempMutes: tempMutes.data?.length || 0
        }
    };

    // Le log est déjà géré par events/core/rgpdManager.ts
    return result;
}

// ============================================
// Fonctions utilitaires
// ============================================

/**
 * Vérifie si un utilisateur a des données stockées
 */
export async function hasUserData(userId: string): Promise<boolean> {
    const summary = await getCompleteUserDataSummary(userId);
    return (
        summary.commandCount > 0 ||
        summary.messageCount > 0 ||
        summary.birthdayCount > 0 ||
        summary.reminderCount > 0 ||
        summary.warningCount > 0 ||
        summary.moderationHistoryCount > 0 ||
        summary.giveawayParticipations > 0
    );
}

/**
 * Génère un rapport de confidentialité pour un utilisateur
 */
export function generatePrivacyReport(summary: UserDataSummary): string {
    const sections: string[] = [];

    // Statistiques d'utilisation
    if (summary.commandCount > 0 || summary.messageCount > 0) {
        sections.push(`📊 **Statistiques d'utilisation**\n• ${summary.commandCount} commandes exécutées\n• ${summary.messageCount} messages comptabilisés`);
    }

    // Données personnelles
    const personalData: string[] = [];
    if (summary.birthdayCount > 0) personalData.push(`• ${summary.birthdayCount} anniversaire(s) enregistré(s)`);
    if (summary.reminderCount > 0) personalData.push(`• ${summary.reminderCount} rappel(s) actif(s)`);
    if (personalData.length > 0) {
        sections.push(`🎂 **Données personnelles**\n${personalData.join('\n')}`);
    }

    // Modération
    const modData: string[] = [];
    if (summary.warningCount > 0) modData.push(`• ${summary.warningCount} avertissement(s)`);
    if (summary.moderationHistoryCount > 0) modData.push(`• ${summary.moderationHistoryCount} entrée(s) dans l'historique de modération`);
    if (summary.activeTempBans > 0) modData.push(`• ${summary.activeTempBans} ban(s) temporaire(s) actif(s)`);
    if (summary.activeTempMutes > 0) modData.push(`• ${summary.activeTempMutes} mute(s) temporaire(s) actif(s)`);
    if (modData.length > 0) {
        sections.push(`⚖️ **Données de modération**\n${modData.join('\n')}\n*Ces données ne peuvent pas être supprimées pour des raisons de sécurité.*`);
    }

    // Participations
    if (summary.giveawayParticipations > 0) {
        sections.push(`🎁 **Participations**\n• ${summary.giveawayParticipations} participation(s) à des giveaways`);
    }

    if (sections.length === 0) {
        return '✨ Aucune donnée n\'est actuellement stockée vous concernant.';
    }

    return sections.join('\n\n');
}
