import { Events, GuildMember } from 'discord.js';
import { logMemberLeave } from '../logs/memberLogs.ts';

export const name = Events.GuildMemberRemove;
export const once = false;

export async function execute(member: GuildMember) {
    await logMemberLeave(member);
}
