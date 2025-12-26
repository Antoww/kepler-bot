import { Events } from 'discord.js';
import { logMessageBulkDelete } from '../logs/messageLogs.ts';
import { getArchiveUrl } from '../../utils/archiveCache.ts';

export const name = Events.MessageBulkDelete;
export const once = false;

export async function execute(messages: any, channel: any) {
    // Petit délai pour laisser le temps à la commande clear de stocker l'URL dans le cache
    setTimeout(async () => {
        // Récupérer l'URL d'archive depuis le cache
        const messageIds = Array.from(messages.keys());
        const archiveUrl = getArchiveUrl(channel.guild.id, channel.id, messageIds);
        
        // Attacher l'URL aux messages si elle existe
        if (archiveUrl) {
            (messages as any).archiveUrl = archiveUrl;
        }
        
        await logMessageBulkDelete(messages, channel);
    }, 500);
}
