import { supabase } from '../database/supabase.ts';
import { logger } from './logger.ts';

// ============================================
// Module de tracking des statistiques du bot
// ============================================

export interface CommandStat {
    command_name: string;
    user_id: string;
    guild_id: string;
    success: boolean;
}

export interface MessageStat {
    guild_id: string;
    channel_id: string;
    user_id: string;
}

export interface DailyStatsData {
    date: string;
    commands: number;
    messages: number;
    users: number;
}

export interface CommandBreakdown {
    command_name: string;
    count: number;
}

export interface UserActivity {
    user_id: string;
    message_count: number;
}

// ============================================
// Fonctions de tracking (écriture)
// ============================================

/**
 * Enregistre l'exécution d'une commande
 */
export async function trackCommand(stat: CommandStat): Promise<void> {
    try {
        // Enregistrer la commande
        await supabase.from('command_stats').insert({
            command_name: stat.command_name,
            user_id: stat.user_id,
            guild_id: stat.guild_id,
            success: stat.success
        });

        // Mettre à jour les stats journalières par guild
        await updateDailyStats(stat.guild_id, 'command');
        
        // Mettre à jour les stats globales
        await updateGlobalDailyStats('command', stat.guild_id);
    } catch (error) {
        logger.error('Erreur tracking commande', error, 'StatsTracker');
    }
}

/**
 * Enregistre un message vu par le bot
 */
export async function trackMessage(stat: MessageStat): Promise<void> {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Upsert pour incrémenter le compteur de messages
        const { error } = await supabase.rpc('increment_message_count', {
            p_guild_id: stat.guild_id,
            p_channel_id: stat.channel_id,
            p_user_id: stat.user_id,
            p_date: today
        });

        // Si la fonction RPC n'existe pas, utiliser la méthode classique
        if (error) {
            // Essayer d'insérer ou mettre à jour manuellement
            const { data: existing } = await supabase
                .from('message_stats')
                .select('id, message_count')
                .eq('guild_id', stat.guild_id)
                .eq('channel_id', stat.channel_id)
                .eq('user_id', stat.user_id)
                .eq('message_date', today)
                .single();

            if (existing) {
                await supabase
                    .from('message_stats')
                    .update({ message_count: existing.message_count + 1 })
                    .eq('id', existing.id);
            } else {
                await supabase.from('message_stats').insert({
                    guild_id: stat.guild_id,
                    channel_id: stat.channel_id,
                    user_id: stat.user_id,
                    message_date: today,
                    message_count: 1
                });
            }
        }

        // Mettre à jour les stats journalières
        await updateDailyStats(stat.guild_id, 'message');
        await updateGlobalDailyStats('message', stat.guild_id);
    } catch (error) {
        logger.error('Erreur tracking message', error, 'StatsTracker');
    }
}

/**
 * Met à jour les statistiques journalières par guild
 */
async function updateDailyStats(guildId: string, type: 'command' | 'message'): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('guild_id', guildId)
        .eq('stat_date', today)
        .single();

    if (existing) {
        const update = type === 'command' 
            ? { total_commands: existing.total_commands + 1 }
            : { total_messages: existing.total_messages + 1 };
        
        await supabase
            .from('daily_stats')
            .update(update)
            .eq('id', existing.id);
    } else {
        await supabase.from('daily_stats').insert({
            stat_date: today,
            guild_id: guildId,
            total_commands: type === 'command' ? 1 : 0,
            total_messages: type === 'message' ? 1 : 0,
            unique_users: 1
        });
    }
}

/**
 * Met à jour les statistiques globales journalières
 */
async function updateGlobalDailyStats(type: 'command' | 'message', _guildId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
        .from('global_daily_stats')
        .select('*')
        .eq('stat_date', today)
        .single();

    if (existing) {
        const update = type === 'command' 
            ? { total_commands: existing.total_commands + 1 }
            : { total_messages: existing.total_messages + 1 };
        
        await supabase
            .from('global_daily_stats')
            .update(update)
            .eq('id', existing.id);
    } else {
        await supabase.from('global_daily_stats').insert({
            stat_date: today,
            total_commands: type === 'command' ? 1 : 0,
            total_messages: type === 'message' ? 1 : 0,
            unique_users: 1,
            unique_guilds: 1
        });
    }
}

// ============================================
// Fonctions de récupération des stats (lecture)
// ============================================

/**
 * Récupère les statistiques des 30 derniers jours
 */
export async function getDailyStats(days: number = 30, guildId?: string): Promise<DailyStatsData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    if (guildId) {
        const { data, error } = await supabase
            .from('daily_stats')
            .select('stat_date, total_commands, total_messages, unique_users')
            .eq('guild_id', guildId)
            .gte('stat_date', startDateStr)
            .order('stat_date', { ascending: true });

        if (error) throw error;
        
        return (data || []).map(d => ({
            date: d.stat_date,
            commands: d.total_commands,
            messages: d.total_messages,
            users: d.unique_users
        }));
    } else {
        const { data, error } = await supabase
            .from('global_daily_stats')
            .select('stat_date, total_commands, total_messages, unique_users')
            .gte('stat_date', startDateStr)
            .order('stat_date', { ascending: true });

        if (error) throw error;
        
        return (data || []).map(d => ({
            date: d.stat_date,
            commands: d.total_commands,
            messages: d.total_messages,
            users: d.unique_users
        }));
    }
}

/**
 * Récupère le top des commandes utilisées
 */
export async function getTopCommands(days: number = 30, limit: number = 10, guildId?: string): Promise<CommandBreakdown[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
        .from('command_stats')
        .select('command_name')
        .gte('executed_at', startDate.toISOString());

    if (guildId) {
        query = query.eq('guild_id', guildId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Compter les commandes
    const counts: Record<string, number> = {};
    for (const row of data || []) {
        counts[row.command_name] = (counts[row.command_name] || 0) + 1;
    }

    // Trier et limiter
    return Object.entries(counts)
        .map(([command_name, count]) => ({ command_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

/**
 * Récupère les utilisateurs les plus actifs (messages)
 */
export async function getTopUsers(days: number = 30, limit: number = 10, guildId?: string): Promise<UserActivity[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    let query = supabase
        .from('message_stats')
        .select('user_id, message_count')
        .gte('message_date', startDateStr);

    if (guildId) {
        query = query.eq('guild_id', guildId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Agréger par utilisateur
    const userCounts: Record<string, number> = {};
    for (const row of data || []) {
        userCounts[row.user_id] = (userCounts[row.user_id] || 0) + row.message_count;
    }

    // Trier et limiter
    return Object.entries(userCounts)
        .map(([user_id, message_count]) => ({ user_id, message_count }))
        .sort((a, b) => b.message_count - a.message_count)
        .slice(0, limit);
}

/**
 * Récupère les statistiques totales
 */
export async function getTotalStats(guildId?: string): Promise<{
    totalCommands: number;
    totalMessages: number;
    totalDays: number;
}> {
    if (guildId) {
        const { data: commandData } = await supabase
            .from('command_stats')
            .select('id', { count: 'exact' })
            .eq('guild_id', guildId);

        const { data: messageData } = await supabase
            .from('message_stats')
            .select('message_count')
            .eq('guild_id', guildId);

        const { data: daysData } = await supabase
            .from('daily_stats')
            .select('id', { count: 'exact' })
            .eq('guild_id', guildId);

        const totalMessages = (messageData || []).reduce((sum, row) => sum + row.message_count, 0);

        return {
            totalCommands: commandData?.length || 0,
            totalMessages,
            totalDays: daysData?.length || 0
        };
    } else {
        const { count: commandCount } = await supabase
            .from('command_stats')
            .select('*', { count: 'exact', head: true });

        const { data: messageData } = await supabase
            .from('message_stats')
            .select('message_count');

        const { count: daysCount } = await supabase
            .from('global_daily_stats')
            .select('*', { count: 'exact', head: true });

        const totalMessages = (messageData || []).reduce((sum, row) => sum + row.message_count, 0);

        return {
            totalCommands: commandCount || 0,
            totalMessages,
            totalDays: daysCount || 0
        };
    }
}

// ============================================
// Utilitaires pour les graphiques
// ============================================

/**
 * Génère un graphique ASCII à barres horizontales
 */
export function generateBarChart(data: { label: string; value: number }[], maxWidth: number = 20): string {
    if (data.length === 0) return 'Aucune donnée';

    const maxValue = Math.max(...data.map(d => d.value));
    const lines: string[] = [];

    for (const item of data) {
        const barLength = maxValue > 0 ? Math.round((item.value / maxValue) * maxWidth) : 0;
        const bar = '█'.repeat(barLength) + '░'.repeat(maxWidth - barLength);
        lines.push(`${item.label.padEnd(12)} ${bar} ${item.value}`);
    }

    return lines.join('\n');
}

/**
 * Génère un mini graphique de tendance (sparkline)
 */
export function generateSparkline(values: number[]): string {
    if (values.length === 0) return '';
    
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values.map(v => {
        const index = Math.min(Math.floor(((v - min) / range) * (chars.length - 1)), chars.length - 1);
        return chars[index];
    }).join('');
}

/**
 * Génère un graphique de tendance sur plusieurs jours
 */
export function generateTrendChart(data: DailyStatsData[], metric: 'commands' | 'messages'): string {
    if (data.length === 0) return 'Aucune donnée disponible';

    const values = data.map(d => metric === 'commands' ? d.commands : d.messages);
    const labels = data.map(d => {
        const date = new Date(d.date);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    });

    const maxValue = Math.max(...values);
    const height = 8;
    const lines: string[] = [];

    // Créer le graphique vertical
    for (let row = height; row >= 1; row--) {
        const threshold = (row / height) * maxValue;
        let line = '';
        for (const value of values) {
            line += value >= threshold ? '█' : ' ';
        }
        lines.push(`${Math.round(threshold).toString().padStart(5)} │${line}`);
    }

    // Ligne de base
    lines.push('      └' + '─'.repeat(values.length));
    
    // Labels (seulement quelques-uns pour pas surcharger)
    if (labels.length <= 10) {
        lines.push('       ' + labels.join(''));
    }

    return lines.join('\n');
}

// ============================================
// Fonctions RGPD - Gestion des données personnelles
// ============================================

export interface UserDataSummary {
    commandCount: number;
    messageCount: number;
    firstActivity: string | null;
    lastActivity: string | null;
    guilds: string[];
}

/**
 * Récupère un résumé des données d'un utilisateur (RGPD - Droit d'accès)
 */
export async function getUserDataSummary(userId: string): Promise<UserDataSummary> {
    // Compter les commandes
    const { data: commandData } = await supabase
        .from('command_stats')
        .select('guild_id, executed_at')
        .eq('user_id', userId)
        .order('executed_at', { ascending: true });

    // Compter les messages
    const { data: messageData } = await supabase
        .from('message_stats')
        .select('guild_id, message_count, message_date')
        .eq('user_id', userId)
        .order('message_date', { ascending: true });

    const commandCount = commandData?.length || 0;
    const messageCount = (messageData || []).reduce((sum, row) => sum + row.message_count, 0);

    // Collecter les guilds uniques
    const guildsSet = new Set<string>();
    commandData?.forEach(row => guildsSet.add(row.guild_id));
    messageData?.forEach(row => guildsSet.add(row.guild_id));

    // Déterminer les dates d'activité
    let firstActivity: string | null = null;
    let lastActivity: string | null = null;

    if (commandData && commandData.length > 0) {
        firstActivity = commandData[0].executed_at;
        lastActivity = commandData[commandData.length - 1].executed_at;
    }

    if (messageData && messageData.length > 0) {
        const firstMsgDate = messageData[0].message_date;
        const lastMsgDate = messageData[messageData.length - 1].message_date;
        
        if (!firstActivity || firstMsgDate < firstActivity) {
            firstActivity = firstMsgDate;
        }
        if (!lastActivity || lastMsgDate > lastActivity) {
            lastActivity = lastMsgDate;
        }
    }

    return {
        commandCount,
        messageCount,
        firstActivity,
        lastActivity,
        guilds: Array.from(guildsSet)
    };
}

/**
 * Supprime toutes les données d'un utilisateur (RGPD - Droit à l'effacement)
 */
export async function deleteUserData(userId: string): Promise<{ commandsDeleted: number; messagesDeleted: number }> {
    // Supprimer les commandes
    const { data: deletedCommands } = await supabase
        .from('command_stats')
        .delete()
        .eq('user_id', userId)
        .select('id');

    // Supprimer les messages
    const { data: deletedMessages } = await supabase
        .from('message_stats')
        .delete()
        .eq('user_id', userId)
        .select('id');

    return {
        commandsDeleted: deletedCommands?.length || 0,
        messagesDeleted: deletedMessages?.length || 0
    };
}

/**
 * Purge les données anciennes (RGPD - Limitation de conservation)
 * Par défaut, supprime les données de plus de 90 jours
 */
export async function purgeOldData(retentionDays: number = 90): Promise<{ commandsPurged: number; messagesPurged: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString();
    const cutoffDateOnly = cutoffDate.toISOString().split('T')[0];

    // Purger les anciennes commandes
    const { data: purgedCommands } = await supabase
        .from('command_stats')
        .delete()
        .lt('executed_at', cutoffDateStr)
        .select('id');

    // Purger les anciens messages
    const { data: purgedMessages } = await supabase
        .from('message_stats')
        .delete()
        .lt('message_date', cutoffDateOnly)
        .select('id');

    // Purger les anciennes stats journalières
    await supabase
        .from('daily_stats')
        .delete()
        .lt('stat_date', cutoffDateOnly);

    await supabase
        .from('global_daily_stats')
        .delete()
        .lt('stat_date', cutoffDateOnly);

    console.log(`[RGPD] Purge effectuée: ${purgedCommands?.length || 0} commandes, ${purgedMessages?.length || 0} entrées de messages supprimées (données > ${retentionDays} jours)`);

    return {
        commandsPurged: purgedCommands?.length || 0,
        messagesPurged: purgedMessages?.length || 0
    };
}

/**
 * Exporte les données d'un utilisateur au format JSON (RGPD - Portabilité)
 */
export async function exportUserData(userId: string): Promise<object> {
    const { data: commands } = await supabase
        .from('command_stats')
        .select('command_name, guild_id, executed_at, success')
        .eq('user_id', userId)
        .order('executed_at', { ascending: false });

    const { data: messages } = await supabase
        .from('message_stats')
        .select('guild_id, channel_id, message_date, message_count')
        .eq('user_id', userId)
        .order('message_date', { ascending: false });

    return {
        export_date: new Date().toISOString(),
        user_id: userId,
        data_retention_days: 90,
        commands: commands || [],
        messages: messages || []
    };
}
