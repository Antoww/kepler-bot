import { Events, Message, PartialMessage } from 'discord.js';
import { logMessageUpdate } from '../logs/messageLogs.ts';

export const name = Events.MessageUpdate;
export const once = false;

export async function execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    await logMessageUpdate(oldMessage, newMessage);
}
