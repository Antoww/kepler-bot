import { Events, Message, PartialMessage } from 'discord.js';
import { logMessageDelete } from '../logs/messageLogs.ts';

export const name = Events.MessageDelete;
export const once = false;

export async function execute(message: Message | PartialMessage) {
    await logMessageDelete(message);
}
