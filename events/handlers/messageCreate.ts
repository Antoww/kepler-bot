import { type Message } from 'discord.js';
import { CountingManager } from '../../managers/countingManager.ts';
import { trackMessage } from '../../utils/stats/tracker.ts';
import { awardMessageXp } from '../../utils/xp/system.ts';
import { logger } from '../../utils/logger.ts';

export const name = 'messageCreate';

export async function execute(message: Message) {
    // Vérifier si c'est un message dans un serveur
    if (!message.guild) return;

    // Ne pas traiter les messages des bots
    if (message.author.bot) return;

    try {
        if (await message.client.moderationManager?.handleMessage(message)) return;
    } catch (error) {
        logger.error('Erreur auto-modération', error, 'AUTOMOD');
    }

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
