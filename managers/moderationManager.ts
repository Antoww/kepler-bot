import { Client } from 'discord.js';
import { getExpiredTempBans, getExpiredTempMutes, removeTempBan, removeTempMute } from '../database/db.ts';
import { logModeration } from '../utils/moderationLogger.ts';
import { isNetworkError, isMaintenanceError, dbCircuitBreaker } from '../utils/retryHelper.ts';
import { logger } from '../utils/logger.ts';

export class ModerationManager {
    private client: Client;
    private checkInterval: NodeJS.Timeout | null = null;
    private lastMaintenanceLog: number = 0;

    constructor(client: Client) {
        this.client = client;
    }

    start() {
        logger.manager('ModerationManager', 'démarré');
        // Vérifier toutes les minutes
        this.checkInterval = setInterval(() => {
            this.checkExpiredSanctions();
        }, 60000); // 60 secondes
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        logger.manager('ModerationManager', 'arrêté');
    }

    private async checkExpiredSanctions() {
        // Vérifier le circuit breaker
        if (!dbCircuitBreaker.canAttempt()) {
            const status = dbCircuitBreaker.getStatus();
            const nextAttemptMin = Math.ceil(status.nextAttemptIn / 60000);
            
            // Logger une seule fois par période de 5 minutes
            const now = Date.now();
            if (now - this.lastMaintenanceLog >= 5 * 60 * 1000) {
                console.log(`🔒 Circuit breaker actif - Prochaine tentative dans ~${nextAttemptMin} minutes (${status.failureCount} échecs consécutifs détectés)`);
                this.lastMaintenanceLog = now;
            }
            return;
        }

        try {
            await this.checkExpiredTempBans();
            await this.checkExpiredTempMutes();
            
            // Succès : réinitialiser le circuit breaker
            dbCircuitBreaker.recordSuccess();
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
            // Distinguer les différents types d'erreurs
            if (isMaintenanceError(error)) {
                dbCircuitBreaker.recordFailure();
                const status = dbCircuitBreaker.getStatus();
                console.warn(`🔧 Maintenance Supabase détectée (${status.failureCount}/${3}) - Passage en mode attente si persistant`);
            } else if (isNetworkError(error)) {
                dbCircuitBreaker.recordFailure();
                console.warn('⚠️ Erreur réseau lors de la vérification des bans temporaires (sera réessayé):', (error as Error).message);
            } else {
                // Erreur non liée au réseau : ne pas activer le circuit breaker
                console.error('❌ Erreur lors de la vérification des bans temporaires:', {
                    message: (error as Error).message,
                    details: error,
                    hint: '',
                    code: ''
                });
            }
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
            // Distinguer les différents types d'erreurs
            if (isMaintenanceError(error)) {
                dbCircuitBreaker.recordFailure();
                const status = dbCircuitBreaker.getStatus();
                console.warn(`🔧 Maintenance Supabase détectée (${status.failureCount}/${3}) - Passage en mode attente si persistant`);
            } else if (isNetworkError(error)) {
                dbCircuitBreaker.recordFailure();
                console.warn('⚠️ Erreur réseau lors de la vérification des mutes temporaires (sera réessayé):', (error as Error).message);
            } else {
                // Erreur non liée au réseau : ne pas activer le circuit breaker
                console.error('❌ Erreur lors de la vérification des mutes temporaires:', {
                    message: (error as Error).message,
                    details: error,
                    hint: '',
                    code: ''
                });
            }
        }
    }
}
