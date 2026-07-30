import { Events, GuildMember } from 'discord.js';
import { logMemberLeave } from '../logs/memberLogs.ts';
import { logger } from '../../utils/logger.ts';

export const name = Events.GuildMemberRemove;
export const once = false;

export async function execute(member: GuildMember) {
    try {
        await member.client.inviteManager?.handleMemberRemove(member);
    } catch (error) {
        logger.error(`Erreur enregistrement départ de ${member.id}`, error, 'INVITES');
    }
    await logMemberLeave(member);
}
