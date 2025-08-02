import { Events, GuildEmoji } from 'discord.js';
import { logEmojiCreate } from '../logs/miscLogs.ts';

export const name = Events.GuildEmojiCreate;
export const once = false;

export async function execute(emoji: GuildEmoji) {
    await logEmojiCreate(emoji);
}
