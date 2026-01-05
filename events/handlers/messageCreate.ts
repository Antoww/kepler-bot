import { type Message, Events } from "discord.js";
import { trackMessage } from '../../utils/statsTracker.ts';

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    // Ignorer les messages des bots
    if (message.author.bot) return;
    
    // Ignorer les messages en DM
    if (!message.guild) return;

    // Tracker le message pour les statistiques
    try {
        await trackMessage({
            guild_id: message.guild.id,
            channel_id: message.channel.id,
            user_id: message.author.id
        });
    } catch (_error) {
        // Log silencieux pour ne pas spammer la console
        // Les erreurs de tracking ne doivent pas affecter le fonctionnement du bot
    }
}
