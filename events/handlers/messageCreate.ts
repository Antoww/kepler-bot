import { type Message } from 'discord.js';
import { CountingManager } from '../core/countingManager.ts';
import { trackMessage } from '../../utils/statsTracker.ts';
import { awardMessageXp } from '../../utils/xpSystem.ts';
import { logger } from '../../utils/logger.ts';

export const name = 'messageCreate';

export async function execute(message: Message) {
    // Vérifier si c'est un message dans un serveur
    if (!message.guild) return;

    // Ne pas traiter les messages des bots
    if (message.author.bot) return;

    // Tracker le message pour les statistiques
    trackMessage({
        guild_id: message.guild.id,
        channel_id: message.channel.id,
        user_id: message.author.id
    }).catch(() => {
        // Ignorer silencieusement les erreurs de tracking
    });

    awardMessageXp(message).catch(error => {
        logger.error('Erreur attribution XP', error, 'XP');
    });

    // Traiter le comptage
    await CountingManager.handleMessage(message);
}
