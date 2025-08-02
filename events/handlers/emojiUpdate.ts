import { Events, GuildEmoji } from 'discord.js';
import { logEmojiUpdate } from '../logs/miscLogs.ts';

export const name = Events.GuildEmojiUpdate;
export const once = false;

export async function execute(oldEmoji: GuildEmoji, newEmoji: GuildEmoji) {
    await logEmojiUpdate(oldEmoji, newEmoji);
}
