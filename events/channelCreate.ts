import { Events, GuildChannel } from 'discord.js';
import { logChannelCreate } from './guildLogs.ts';

export const name = Events.ChannelCreate;
export const once = false;

export async function execute(channel: GuildChannel) {
    await logChannelCreate(channel);
} 