import { Events, GuildBan } from 'discord.js';
import { logMemberBan } from '../logs/memberLogs.ts';

export const name = Events.GuildBanAdd;
export const once = false;

export async function execute(ban: GuildBan) {
    await logMemberBan(ban);
}
