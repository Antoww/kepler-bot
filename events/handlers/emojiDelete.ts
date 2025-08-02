import { Events, GuildEmoji } from 'discord.js';
import { logEmojiDelete } from '../logs/miscLogs.ts';

export const name = Events.GuildEmojiDelete;
export const once = false;

export async function execute(emoji: GuildEmoji) {
    await logEmojiDelete(emoji);
}
