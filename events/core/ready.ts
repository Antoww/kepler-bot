import { type Client } from 'discord.js';

export const name = 'ready';
export const once = true;

export function execute(client: Client<true>) {
    console.log(`[LOG : ${new Date().toLocaleDateString()}] Bot connecté en tant que ${client.user?.tag}`);
    console.log(`[LOG : ${new Date().toLocaleDateString()}] Prêt à servir ${client.guilds.cache.size} serveur(s)`);
    
    // Définir le statut du bot
    client.user.setActivity('la modération', { type: 3 }); // Type 3 = Watching
}