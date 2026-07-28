import { Events, GuildMember } from 'discord.js';
import { logMemberJoin } from '../logs/memberLogs.ts';
import { syncXpRewardRoles } from '../../utils/xpSystem.ts';
import { logger } from '../../utils/logger.ts';

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(member: GuildMember) {
    await logMemberJoin(member);
    try {
        await syncXpRewardRoles(member);
    } catch (error) {
        logger.error(`Erreur restauration des rôles XP de ${member.id}`, error, 'XP');
    }
}
