import { Events, Sticker } from 'discord.js';
import { logStickerDelete } from '../logs/miscLogs.ts';

export const name = Events.GuildStickerDelete;
export const once = false;

export async function execute(sticker: Sticker) {
    await logStickerDelete(sticker);
}
