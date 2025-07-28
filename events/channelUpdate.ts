import { Events, GuildChannel } from 'discord.js';
import { logChannelUpdate } from './guildLogs.ts';

export const name = Events.ChannelUpdate;
export const once = false;

export async function execute(oldChannel: GuildChannel, newChannel: GuildChannel) {
    await logChannelUpdate(oldChannel, newChannel);
} 