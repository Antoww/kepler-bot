/**
 * Cache temporaire pour transmettre les archives de /clear à l'événement
 * MessageBulkDelete.
 */
import { logger } from '../logger.ts';

export interface ArchiveEntry {
    url?: string;
    content?: string;
    filename?: string;
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
    // Tous les IDs sont triés afin que l'ordre des collections Discord
    // n'empêche jamais l'événement de retrouver l'archive.
    const ids = [...messageIds].sort().join('-');
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
    logger.debug('URL archive stockée', { key }, 'ArchiveCache');
}

/**
 * Stocke une archive texte destinée au log Discord.
 */
export function storeArchiveContent(
    guildId: string,
    channelId: string,
    messageIds: string[],
    content: string,
    filename: string
): void {
    const key = generateCacheKey(guildId, channelId, messageIds);
    archiveCache.set(key, {
        content,
        filename,
        timestamp: Date.now()
    });
    logger.debug('Archive texte stockée', { key, filename }, 'ArchiveCache');
}

/**
 * Récupère une URL d'archive depuis le cache
 */
export function getArchiveUrl(guildId: string, channelId: string, messageIds: string[]): string | null {
    return getArchive(guildId, channelId, messageIds)?.url ?? null;
}

export function getArchive(
    guildId: string,
    channelId: string,
    messageIds: string[]
): ArchiveEntry | null {
    const key = generateCacheKey(guildId, channelId, messageIds);
    const entry = archiveCache.get(key);
    
    if (entry) {
        logger.debug('URL archive récupérée', { key }, 'ArchiveCache');
        // Supprimer l'entrée après utilisation
        archiveCache.delete(key);
        return entry;
    }
    
    logger.debug('URL archive non trouvée', { key }, 'ArchiveCache');
    return null;
}
