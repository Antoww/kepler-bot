import { Events, GuildMember } from 'discord.js';
import { logMemberUpdate } from '../logs/voiceAndMemberLogs.ts';

export const name = Events.GuildMemberUpdate;
export const once = false;

export async function execute(oldMember: GuildMember, newMember: GuildMember) {
    await logMemberUpdate(oldMember, newMember);
}
