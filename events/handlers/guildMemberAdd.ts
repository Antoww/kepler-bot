import { Events, GuildMember } from 'discord.js';
import { logMemberJoin } from '../logs/memberLogs.ts';
import { syncXpRewardRoles } from '../../utils/xp/system.ts';
import { logger } from '../../utils/logger.ts';
import { sendXpLog } from '../../utils/xp/logger.ts';

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(member: GuildMember) {
    try {
        await member.client.moderationManager?.handleMemberJoin(member);
    } catch (error) {
        logger.error(`Erreur anti-raid pour ${member.id}`, error, 'AUTOMOD');
    }
    try {
        await member.client.inviteManager?.handleMemberJoin(member);
    } catch (error) {
        logger.error(`Erreur détection invitation de ${member.id}`, error, 'INVITES');
    }
    await logMemberJoin(member);
    try {
        const restoredRoles = await syncXpRewardRoles(member);
        if (restoredRoles.length) {
            await sendXpLog(
                member.guild,
                'Rôles XP restaurés',
                `${restoredRoles.length} rôle(s) ont été rendus à <@${member.id}> après son retour.`,
                'success',
                [{
                    name: 'Rôles',
                    value: restoredRoles.map(roleId => `<@&${roleId}>`).join(', '),
                    inline: false
                }]
            );
        }
    } catch (error) {
        logger.error(`Erreur restauration des rôles XP de ${member.id}`, error, 'XP');
    }
}
