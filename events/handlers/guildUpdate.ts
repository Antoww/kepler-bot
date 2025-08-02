import { Events, Guild } from 'discord.js';
import { logGuildUpdate } from '../logs/guildLogs.ts';

export const name = Events.GuildUpdate;
export const once = false;

export async function execute(oldGuild: Guild, newGuild: Guild) {
    await logGuildUpdate(oldGuild, newGuild);
} 
