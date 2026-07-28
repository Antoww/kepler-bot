import { Events, type Guild } from 'discord.js';
import { logger } from '../../utils/logger.ts';

export const name = Events.GuildCreate;
export const once = false;

export async function execute(guild: Guild) {
    try {
        await guild.client.inviteManager?.handleGuildCreate(guild);
    } catch (error) {
        logger.error(`Erreur initialisation invitations de ${guild.id}`, error, 'INVITES');
    }
}
