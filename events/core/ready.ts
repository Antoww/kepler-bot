import { type Client } from 'discord.js';
import version from '../../version.json' with { type: 'json' };
import { initializeGiveaways } from './giveawayManager.ts';
import { logger } from '../../utils/logger.ts';

export const name = 'ready';
export const once = true;

export async function execute(client: Client<true>) {
    logger.success(`Bot connecté: ${client.user?.tag}`, undefined, 'BOT');
    logger.info(`${client.guilds.cache.size} serveur(s) - v${version.version} (${version.codename})`, undefined, 'BOT');
    
    // Définir le statut du bot avec la version depuis version.json
    // Types d'activité Discord :
    // 0 = Playing (Joue à)
    // 1 = Streaming (En stream) 
    // 2 = Listening (Écoute)
    // 3 = Watching (Regarde)
    // 4 = Custom (Statut personnalisé)
    // 5 = Competing (En compétition dans)
    client.user.setActivity(`v${version.version} • ${version.codename}`, { type: 3 }); // Type 3 = Watching
    
    // Initialiser les giveaways
    try {
        await initializeGiveaways(client);
    } catch (error) {
        logger.error('Erreur initialisation giveaways', error, 'Giveaway');
    }
}