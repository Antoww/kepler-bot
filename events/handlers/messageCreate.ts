import { type Message } from 'discord.js';
import { CountingManager } from '../core/countingManager.ts';
import { trackMessage } from '../../utils/statsTracker.ts';

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

    // Traiter le comptage
    await CountingManager.handleMessage(message);
}
