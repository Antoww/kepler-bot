import { Events } from 'discord.js';
import { logMessageBulkDelete } from '../logs/messageLogs.ts';

export const name = Events.MessageBulkDelete;
export const once = false;

export async function execute(messages: any, channel: any) {
    await logMessageBulkDelete(messages, channel);
}
