import { Events, GuildMember } from 'discord.js';
import { logMemberJoin } from '../logs/memberLogs.ts';

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(member: GuildMember) {
    await logMemberJoin(member);
}
