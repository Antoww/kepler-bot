import { type Message } from 'discord.js';
import { CountingManager } from '../core/countingManager.ts';

export const name = 'messageCreate';

export async function execute(message: Message) {
    // Vérifier si c'est un message dans un serveur
    if (!message.guild) return;

    // Ne pas traiter les messages des bots
    if (message.author.bot) return;

    // Traiter le comptage
    await CountingManager.handleMessage(message);
}
