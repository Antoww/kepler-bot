/**
 * Cache temporaire pour stocker les URLs d'archives Pastebin
 * Utilisé pour transmettre les URLs entre la commande clear et l'événement MessageBulkDelete
 */

interface ArchiveEntry {
    url: string;
    timestamp: number;
}

const archiveCache = new Map<string, ArchiveEntry>();

// Nettoyer les entrées expirées toutes les minutes
setInterval(() => {
    const now = Date.now();
    const expirationTime = 60000; // 1 minute
    
    for (const [key, entry] of archiveCache.entries()) {
        if (now - entry.timestamp > expirationTime) {
            archiveCache.delete(key);
        }
    }
}, 60000);

/**
 * Génère une clé unique pour identifier une suppression de messages
 */
function generateCacheKey(guildId: string, channelId: string, messageIds: string[]): string {
    // Utiliser les 3 premiers IDs de messages pour créer une clé unique
    const ids = messageIds.slice(0, 3).sort().join('-');
    return `${guildId}:${channelId}:${ids}`;
}

/**
 * Stocke une URL d'archive dans le cache
 */
export function storeArchiveUrl(guildId: string, channelId: string, messageIds: string[], url: string): void {
    const key = generateCacheKey(guildId, channelId, messageIds);
    archiveCache.set(key, {
        url,
        timestamp: Date.now()
    });
    console.log(`[ArchiveCache] URL stockée avec la clé: ${key}`);
}

/**
 * Récupère une URL d'archive depuis le cache
 */
export function getArchiveUrl(guildId: string, channelId: string, messageIds: string[]): string | null {
    const key = generateCacheKey(guildId, channelId, messageIds);
    const entry = archiveCache.get(key);
    
    if (entry) {
        console.log(`[ArchiveCache] URL trouvée pour la clé: ${key}`);
        // Supprimer l'entrée après utilisation
        archiveCache.delete(key);
        return entry.url;
    }
    
    console.log(`[ArchiveCache] Aucune URL trouvée pour la clé: ${key}`);
    return null;
}
