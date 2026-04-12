import { purgeAllOldData } from '../../utils/rgpdManager.ts';
import { logger } from '../../utils/logger.ts';

/**
 * Gestionnaire RGPD - Purge automatique des données anciennes
 * Conforme au principe de limitation de conservation du RGPD
 * 
 * Conservation:
 * - Statistiques (commandes, messages): 90 jours
 * - Modération (warnings, history): 2 ans
 * - Bans/mutes temporaires expirés: suppression immédiate
 */
export class RGPDManager {
    private purgeInterval: ReturnType<typeof setInterval> | null = null;
    private readonly PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000; // Vérification toutes les 24h

    /**
     * Démarre le gestionnaire RGPD
     */
    start(): void {
        logger.manager('RGPDManager', 'démarré - Purge auto activée');
        logger.info('Conservation: Stats=90j, Modération=2ans', undefined, 'RGPD');
        
        // Effectuer une purge au démarrage (avec délai pour laisser le bot s'initialiser)
        setTimeout(() => {
            this.performPurge();
        }, 30_000); // 30 secondes après le démarrage

        // Planifier une purge quotidienne
        this.purgeInterval = setInterval(() => {
            this.performPurge();
        }, this.PURGE_INTERVAL_MS);
    }

    /**
     * Arrête le gestionnaire RGPD
     */
    stop(): void {
        if (this.purgeInterval) {
            clearInterval(this.purgeInterval);
            this.purgeInterval = null;
            logger.manager('RGPDManager', 'arrêté');
        }
    }

    /**
     * Effectue la purge des données anciennes
     */
    private async performPurge(): Promise<void> {
        try {
            logger.info('Début purge automatique...', undefined, 'RGPD');
            const result = await purgeAllOldData();
            
            const totalPurged = 
                result.stats.commands + 
                result.stats.messages + 
                result.stats.daily +
                result.personal.reminders +
                result.moderation.history +
                result.moderation.tempBans +
                result.moderation.tempMutes;

            if (totalPurged > 0) {
                logger.success(`Purge terminée: ${totalPurged} entrée(s)`, result, 'RGPD');
            } else {
                logger.info('Purge terminée: aucune donnée à supprimer', undefined, 'RGPD');
            }
        } catch (error) {
            logger.error('Erreur purge RGPD', error, 'RGPD');
        }
    }

    /**
     * Force une purge manuelle (pour l'owner)
     */
    async forcePurge() {
        return await purgeAllOldData();
    }
}
