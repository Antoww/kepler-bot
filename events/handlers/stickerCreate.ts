import { Events, Sticker } from 'discord.js';
import { logStickerCreate } from '../logs/miscLogs.ts';

export const name = Events.GuildStickerCreate;
export const once = false;

export async function execute(sticker: Sticker) {
    await logStickerCreate(sticker);
}
