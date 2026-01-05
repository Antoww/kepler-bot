import { purgeOldData } from '../../utils/statsTracker.ts';

/**
 * Gestionnaire RGPD - Purge automatique des données anciennes
 * Conforme au principe de limitation de conservation du RGPD
 */
export class RGPDManager {
    private purgeInterval: ReturnType<typeof setInterval> | null = null;
    private readonly RETENTION_DAYS = 90; // Durée de conservation en jours
    private readonly PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000; // Vérification toutes les 24h

    /**
     * Démarre le gestionnaire RGPD
     */
    start(): void {
        console.log(`[RGPD] Gestionnaire démarré - Conservation des données: ${this.RETENTION_DAYS} jours`);
        
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
            console.log(`[RGPD] Début de la purge des données > ${this.RETENTION_DAYS} jours...`);
            const result = await purgeOldData(this.RETENTION_DAYS);
            
            if (result.commandsPurged > 0 || result.messagesPurged > 0) {
                console.log(`[RGPD] Purge terminée: ${result.commandsPurged} commandes, ${result.messagesPurged} messages supprimés`);
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
    async forcePurge(): Promise<{ commandsPurged: number; messagesPurged: number }> {
        return await purgeOldData(this.RETENTION_DAYS);
    }
}
