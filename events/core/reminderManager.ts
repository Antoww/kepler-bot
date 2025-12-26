import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getExpiredReminders, deleteReminder, getUserReminders } from '../../database/supabase.ts';
import { isNetworkError } from '../../utils/retryHelper.ts';

export class ReminderManager {
    private client: Client;
    private checkInterval: NodeJS.Timeout | null = null;
    private activeReminders: Map<number, NodeJS.Timeout> = new Map();

    constructor(client: Client) {
        this.client = client;
    }

    async start() {
        console.log('⏰ Gestionnaire de rappels démarré');
        
        // Charger les rappels existants au démarrage
        await this.loadExistingReminders();
        
        // Vérifier les rappels expirés toutes les minutes
        this.checkInterval = setInterval(() => {
            this.checkExpiredReminders();
        }, 60000); // 60 secondes
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        // Annuler tous les timeouts actifs
        for (const timeout of this.activeReminders.values()) {
            clearTimeout(timeout);
        }
        this.activeReminders.clear();

        console.log('⏰ Gestionnaire de rappels arrêté');
    }

    async loadExistingReminders() {
        try {
            console.log('🔄 Chargement des rappels existants...');
            
            // Récupérer tous les rappels qui n'ont pas encore été déclenchés
            // Cette requête devrait récupérer tous les rappels futurs de tous les utilisateurs
            const { data: allReminders, error } = await (await import('../../database/supabase.ts')).supabase
                .from('reminders')
                .select('*')
                .gt('timestamp', Date.now())
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('❌ Erreur lors du chargement des rappels:', error);
                return;
            }

            if (!allReminders || allReminders.length === 0) {
                console.log('📭 Aucun rappel futur trouvé');
                return;
            }

            console.log(`📬 ${allReminders.length} rappel(s) futur(s) trouvé(s)`);

            for (const reminder of allReminders) {
                this.scheduleReminder(reminder);
            }

        } catch (error) {
            console.error('❌ Erreur lors du chargement des rappels existants:', error);
        }
    }

    scheduleReminder(reminder: any) {
        const delay = reminder.timestamp - Date.now();
        
        // Ne programmer que si le délai est positif et raisonnable (moins de 2^31-1 ms)
        if (delay > 0 && delay < 2147483647) {
            const timeout = setTimeout(async () => {
                await this.triggerReminder(reminder);
                this.activeReminders.delete(reminder.id);
            }, delay);

            this.activeReminders.set(reminder.id, timeout);
            console.log(`⏰ Rappel programmé: ID ${reminder.id} dans ${Math.round(delay / 1000)}s`);
        } else if (delay <= 0) {
            // Le rappel a déjà expiré, le déclencher immédiatement
            this.triggerReminder(reminder);
        }
    }

    async triggerReminder(reminder: any) {
        try {
            const user = await this.client.users.fetch(reminder.user_id);
            
            const reminderEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🔔 Rappel')
                .setDescription(reminder.message)
                .addFields(
                    { name: '🆔 ID', value: reminder.id.toString(), inline: true },
                    { name: '⏰ Programmé il y a', value: this.formatTimeDifference(Date.now() - new Date(reminder.created_at).getTime()), inline: true }
                )
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`repeat_${reminder.id}`)
                        .setLabel('🔄 Répéter')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`snooze_${reminder.id}`)
                        .setLabel('😴 Reporter (10min)')
                        .setStyle(ButtonStyle.Secondary)
                );

            try {
                await user.send({ embeds: [reminderEmbed], components: [row] });
                console.log(`✅ [RAPPEL LIVRÉ] ID: ${reminder.id} | Utilisateur: ${user.username} | Méthode: Message privé`);
            } catch (dmError) {
                console.log(`⚠️ [RAPPEL NON LIVRÉ] ID: ${reminder.id} | Utilisateur: ${user.username} | Erreur: MP fermés`);
                // Optionnel: Garder le rappel en base pour une nouvelle tentative plus tard
            }

            // Supprimer le rappel de la base de données
            await deleteReminder(reminder.id);
            console.log(`🗑️ Rappel supprimé de la base: ID ${reminder.id}`);

        } catch (error) {
            console.error(`❌ Erreur lors du déclenchement du rappel ${reminder.id}:`, error);
        }
    }

    async checkExpiredReminders() {
        try {
            const expiredReminders = await getExpiredReminders();

            for (const reminder of expiredReminders) {
                // Vérifier si ce rappel n'est pas déjà géré par un timeout
                if (!this.activeReminders.has(reminder.id)) {
                    await this.triggerReminder(reminder);
                }
            }
        } catch (error) {
            // Distinguer les erreurs réseau des autres erreurs
            if (isNetworkError(error)) {
                console.warn('⚠️ Erreur réseau lors de la vérification des rappels expirés (sera réessayé):', (error as Error).message);
            } else {
                console.error('❌ Erreur lors de la vérification des rappels expirés:', error);
            }
        }
    }

    private formatTimeDifference(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} jour(s)`;
        } else if (hours > 0) {
            return `${hours} heure(s)`;
        } else if (minutes > 0) {
            return `${minutes} minute(s)`;
        } else {
            return `${seconds} seconde(s)`;
        }
    }

    // Méthode pour ajouter un nouveau rappel depuis la commande
    addReminder(reminder: any) {
        this.scheduleReminder(reminder);
    }

    // Méthode pour annuler un rappel
    cancelReminder(reminderId: number) {
        const timeout = this.activeReminders.get(reminderId);
        if (timeout) {
            clearTimeout(timeout);
            this.activeReminders.delete(reminderId);
            console.log(`❌ Rappel annulé: ID ${reminderId}`);
            return true;
        }
        return false;
    }
}
