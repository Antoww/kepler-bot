import { Events, Invite } from 'discord.js';
import { logger } from '../../utils/logger.ts';

export const name = Events.InviteDelete;
export const once = false;

export async function execute(invite: Invite) {
    try {
        await invite.client.inviteManager?.handleInviteDelete(invite);
    } catch (error) {
        logger.error(`Erreur suppression invitation ${invite.code}`, error, 'INVITES');
    }
}
