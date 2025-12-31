import { type Client } from 'discord.js';
import config from '../../config.json' with { type: 'json' };
import { initializeGiveaways } from './giveawayManager.ts';

export const name = 'ready';
export const once = true;

export async function execute(client: Client<true>) {
    console.log(`[LOG : ${new Date().toLocaleDateString()}] Bot connecté en tant que ${client.user?.tag}`);
    console.log(`[LOG : ${new Date().toLocaleDateString()}] Prêt à servir ${client.guilds.cache.size} serveur(s)`);
    
    // Définir le statut du bot avec la version depuis config.json
    // Types d'activité Discord :
    // 0 = Playing (Joue à)
    // 1 = Streaming (En stream) 
    // 2 = Listening (Écoute)
    // 3 = Watching (Regarde)
    // 4 = Custom (Statut personnalisé)
    // 5 = Competing (En compétition dans)
    client.user.setActivity(config.botversion, { type: 3 }); // Type 3 = Watching
    
    // Initialiser les giveaways
    try {
        await initializeGiveaways(client);
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des giveaways:', error);
    }
}