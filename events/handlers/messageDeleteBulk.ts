import { Events } from 'discord.js';
import { logMessageBulkDelete } from '../logs/messageLogs.ts';

export const name = Events.MessageBulkDelete;
export const once = false;

export async function execute(messages: any, channel: any) {
    // Petit délai pour laisser le temps à la commande clear d'attacher l'URL d'archive
    setTimeout(async () => {
        await logMessageBulkDelete(messages, channel);
    }, 500);
}
