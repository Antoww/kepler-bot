import { Events, GuildChannel } from 'discord.js';
import { logChannelDelete } from '../logs/guildLogs.ts';

export const name = Events.ChannelDelete;
export const once = false;

export async function execute(channel: GuildChannel) {
    await logChannelDelete(channel);
} 