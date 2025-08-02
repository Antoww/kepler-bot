import { Events, GuildBan } from 'discord.js';
import { logMemberUnban } from '../logs/memberLogs.ts';

export const name = Events.GuildBanRemove;
export const once = false;

export async function execute(ban: GuildBan) {
    await logMemberUnban(ban);
}
