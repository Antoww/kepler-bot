import { purgeAllOldData } from '../../utils/rgpdManager.ts';

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
        console.log('[RGPD] Gestionnaire démarré - Purge automatique activée');
        console.log('[RGPD] Durées de conservation: Stats=90j, Modération=2ans');
        
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
            console.log('[RGPD] Gestionnaire arrêté');
        }
    }

    /**
     * Effectue la purge des données anciennes
     */
    private async performPurge(): Promise<void> {
        try {
            console.log('[RGPD] Début de la purge automatique...');
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
                console.log(`[RGPD] Purge terminée:`);
                console.log(`  - Stats: ${result.stats.commands} commandes, ${result.stats.messages} messages, ${result.stats.daily} daily`);
                console.log(`  - Personnel: ${result.personal.reminders} rappels expirés`);
                console.log(`  - Modération: ${result.moderation.history} historique, ${result.moderation.tempBans} bans, ${result.moderation.tempMutes} mutes`);
            } else {
                console.log('[RGPD] Purge terminée: aucune donnée à supprimer');
            }
        } catch (error) {
            console.error('[RGPD] Erreur lors de la purge:', error);
        }
    }

    /**
     * Force une purge manuelle (pour l'owner)
     */
    async forcePurge() {
        return await purgeAllOldData();
    }
}
