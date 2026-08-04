import { Events, Message, PartialMessage } from 'discord.js';
import { logMessageUpdate } from '../logs/messageLogs.ts';
import { logger } from '../../utils/logger.ts';

export const name = Events.MessageUpdate;
export const once = false;

export async function execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    await logMessageUpdate(oldMessage, newMessage);
    if (!newMessage.guild || newMessage.author?.bot) return;
    try {
        const message = newMessage.partial ? await newMessage.fetch() : newMessage;
        const client = message.client as typeof message.client & {
            moderationManager?: { handleMessage(message: Message, source: 'message_update'): Promise<boolean> };
        };
        await client.moderationManager?.handleMessage(message, 'message_update');
    } catch (error) {
        logger.error('Erreur auto-modération après modification', error, 'AUTOMOD');
    }
}
