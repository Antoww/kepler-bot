import { Events } from 'discord.js';
import { logMessageBulkDelete } from '../logs/messageLogs.ts';
import { getArchive } from '../../utils/moderation/archiveCache.ts';

export const name = Events.MessageBulkDelete;
export const once = false;

export async function execute(messages: any, channel: any) {
    // Petit délai pour laisser le temps à la commande clear de stocker l'URL dans le cache
    setTimeout(async () => {
        // Récupérer l'archive préparée par /clear.
        const messageIds = Array.from(messages.keys());
        const archive = getArchive(channel.guild.id, channel.id, messageIds);
        
        if (archive?.url) {
            (messages as any).archiveUrl = archive.url;
        }
        if (archive?.content) {
            (messages as any).archiveContent = archive.content;
            (messages as any).archiveFilename = archive.filename;
        }
        
        await logMessageBulkDelete(messages, channel);
    }, 500);
}
