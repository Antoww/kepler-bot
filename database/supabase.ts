import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_KEY');

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises'
    );
}

// Client Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Interface pour les rappels
export interface DatabaseReminder {
    id: number;
    reminder_id: number;
    user_id: string;
    message: string;
    duration_ms: number;
    timestamp: number;
    created_at: string;
}

// Interface pour les configurations de serveur
export interface ServerConfig {
    id: number;
    guild_id: string;
    log_channel_id: string;
    created_at: string;
    updated_at: string;
}

// Initialiser la connexion à Supabase
export async function initDatabase(): Promise<void> {
    try {
        // Tester la connexion en récupérant une ligne de test
        const { data, error } = await supabase
            .from('reminders')
            .select('id')
            .limit(1);
            
        if (error) {
            throw error;
        }
    } catch (error) {
        logger.error('Erreur connexion Supabase', error, 'DATABASE');
        throw error;
    }
}

// Créer un nouveau rappel
export async function createReminder(userId: string, message: string, durationMs: number): Promise<DatabaseReminder> {
    const timestamp = Date.now() + durationMs;
    const reminderId = Date.now(); // ID unique basé sur timestamp

    const { data, error } = await supabase
        .from('reminders')
        .insert({
            reminder_id: reminderId,
            user_id: userId,
            message: message,
            duration_ms: durationMs,
            timestamp: timestamp
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Erreur lors de la création du rappel: ${error.message}`);
    }

    return data;
}

// Récupérer un rappel par son ID
export async function getReminder(reminderId: number): Promise<DatabaseReminder | null> {
    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('reminder_id', reminderId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') { // Aucune ligne trouvée
            return null;
        }
        throw new Error(`Erreur lors de la récupération du rappel: ${error.message}`);
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

    if (error) {
        throw new Error(`Erreur lors de la récupération des rappels: ${error.message}`);
    }

    return data || [];
}

// Supprimer un rappel
export async function deleteReminder(reminderId: number, userId?: string): Promise<void> {
    let query = supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;

    if (error) {
        throw new Error(`Erreur lors de la suppression du rappel: ${error.message}`);
    }
}

// Récupérer tous les rappels expirés
export async function getExpiredReminders(): Promise<DatabaseReminder[]> {
    const currentTime = Date.now();
    
    const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .lte('timestamp', currentTime)
        .order('timestamp', { ascending: true });

    if (error) {
        throw new Error(`Erreur lors de la récupération des rappels expirés: ${error.message}`);
    }

    return data || [];
}

// Mettre à jour le canal de logs d'un serveur
export async function updateLogChannel(guildId: string, channelId: string): Promise<void> {
    const { error } = await supabase
        .from('server_configs')
        .upsert({
            guild_id: guildId,
            log_channel_id: channelId,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'guild_id'
        });

    if (error) {
        throw new Error(`Erreur lors de la mise à jour du canal de logs: ${error.message}`);
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
        if (error.code === 'PGRST116') { // Aucune ligne trouvée
            return null;
        }
        throw new Error(`Erreur lors de la récupération du canal de logs: ${error.message}`);
    }

    return data?.log_channel_id || null;
}

// Fermer la connexion à la base de données (pas nécessaire avec Supabase)
export async function closeDatabase(): Promise<void> {
    console.log('🔌 Connexion à Supabase fermée');
}
