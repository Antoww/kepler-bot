import { supabase } from './supabase.ts';

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
    const currentTime = Date.now();
    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .lte('timestamp', currentTime)
        .order('timestamp', { ascending: true });
    
    if (error) throw error;
    return data || [];
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
    created_at: Date;
    updated_at: Date;
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
    const { data, error } = await supabase
        .from('birthdays')
        .select('*')
        .eq('guild_id', guildId)
        .eq('birth_day', day)
        .eq('birth_month', month);
    
    if (error) throw error;
    return data || [];
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
    const { data, error } = await supabase
        .from('temp_bans')
        .select('*')
        .lt('end_time', new Date().toISOString());
    
    if (error) throw error;
    return data || [];
}

// Récupérer les mutes temporaires expirés
export async function getExpiredTempMutes(): Promise<TempMute[]> {
    const { data, error } = await supabase
        .from('temp_mutes')
        .select('*')
        .lt('end_time', new Date().toISOString());
    
    if (error) throw error;
    return data || [];
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
    created_at: Date;
}

// Ajouter une entrée à l'historique de modération
export async function addModerationHistory(
    guildId: string, 
    userId: string, 
    moderatorId: string, 
    actionType: string, 
    reason: string, 
    duration?: string
): Promise<void> {
    const { error } = await supabase
        .from('moderation_history')
        .insert({
            guild_id: guildId,
            user_id: userId,
            moderator_id: moderatorId,
            action_type: actionType,
            reason: reason,
            duration: duration,
            created_at: new Date().toISOString()
        });
    
    if (error) throw error;
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

// Fermer la connexion à la base de données
export async function closeDatabase(): Promise<void> {
    // Avec Supabase, pas besoin de fermer explicitement la connexion
    console.log('🔌 Connexion Supabase fermée');
} 