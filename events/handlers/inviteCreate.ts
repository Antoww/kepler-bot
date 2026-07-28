import { Events, Invite } from 'discord.js';
import { logger } from '../../utils/logger.ts';

export const name = Events.InviteCreate;
export const once = false;

export async function execute(invite: Invite) {
    try {
        await invite.client.inviteManager?.handleInviteCreate(invite);
    } catch (error) {
        logger.error(`Erreur création invitation ${invite.code}`, error, 'INVITES');
    }
}
