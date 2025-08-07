import { Client } from 'discord.js';
import { getExpiredTempBans, getExpiredTempMutes, removeTempBan, removeTempMute } from '../../database/db.ts';
import { logModeration } from '../../utils/moderationLogger.ts';

export class ModerationManager {
    private client: Client;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(client: Client) {
        this.client = client;
    }

    start() {
        // Vérifier toutes les minutes
        this.checkInterval = setInterval(() => {
            this.checkExpiredSanctions();
        }, 60000); // 60 secondes

        console.log('📋 Gestionnaire de modération démarré');
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('📋 Gestionnaire de modération arrêté');
    }

    private async checkExpiredSanctions() {
        try {
            await this.checkExpiredTempBans();
            await this.checkExpiredTempMutes();
        } catch (error) {
            console.error('Erreur lors de la vérification des sanctions expirées:', error);
        }
    }

    private async checkExpiredTempBans() {
        try {
            const expiredBans = await getExpiredTempBans();

            for (const ban of expiredBans) {
                try {
                    const guild = this.client.guilds.cache.get(ban.guild_id);
                    if (!guild) continue;

                    // Vérifier si l'utilisateur est toujours banni
                    const bans = await guild.bans.fetch();
                    if (bans.has(ban.user_id)) {
                        // Récupérer les informations de l'utilisateur
                        const user = await this.client.users.fetch(ban.user_id);
                        
                        // Débannir l'utilisateur
                        await guild.members.unban(ban.user_id, 'Ban temporaire expiré');
                        console.log(`Déban automatique: ${ban.user_id} sur ${guild.name}`);
                        
                        // Logger l'action de déban automatique
                        await logModeration(
                            guild, 
                            'Unban', 
                            user, 
                            this.client.user!, 
                            'Ban temporaire expiré automatiquement',
                            'Automatique'
                        );
                    }

                    // Supprimer l'entrée de la base de données
                    await removeTempBan(ban.id);
                } catch (error) {
                    console.error(`Erreur lors du déban automatique de ${ban.user_id}:`, error);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification des bans temporaires:', error);
        }
    }

    private async checkExpiredTempMutes() {
        try {
            const expiredMutes = await getExpiredTempMutes();

            for (const mute of expiredMutes) {
                try {
                    const guild = this.client.guilds.cache.get(mute.guild_id);
                    if (!guild) continue;

                    const member = guild.members.cache.get(mute.user_id);
                    if (member && member.isCommunicationDisabled()) {
                        // Démuter l'utilisateur
                        await member.timeout(null, 'Mute temporaire expiré');
                        console.log(`Démute automatique: ${mute.user_id} sur ${guild.name}`);
                    }

                    // Supprimer l'entrée de la base de données
                    await removeTempMute(mute.id);
                } catch (error) {
                    console.error(`Erreur lors du démute automatique de ${mute.user_id}:`, error);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification des mutes temporaires:', error);
        }
    }
}
