import * as path from "jsr:@std/path";
import type { Event, Command } from './types.d.ts';
import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config();

// Initialisation du client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

// Collection des commandes
client.commands = new Collection();

// Chargement des commandes
const commandsPath = path.join(Deno.cwd(), 'commands');

for (const file of Deno.readDirSync(commandsPath)) {
    if (!file.isFile || (!file.name.endsWith('.js') && !file.name.endsWith('.ts'))) continue;
    const filePath = path.join(commandsPath, file.name);
    const command = await import(`file:${filePath}`) as Command;

    if (command.data && command.data.name) {
        client.commands.set(command.data.name, command);
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande chargée : ${command.data.name}`);
    } else {
        console.error(`[LOG : ${new Date().toLocaleDateString()}] La commande dans ${filePath} n'a pas de propriété 'data' ou 'name' définie.`);
    }
}

// Chargement des événements
const eventsPath = path.join(Deno.cwd(), 'events');

for (const file of Deno.readDirSync(eventsPath)) {
    if (!file.isFile || (!file.name.endsWith('.js') && !file.name.endsWith('.ts'))) continue;
    const filePath = path.join(eventsPath, file.name);
    const event = await import(`file:${filePath}`) as Event;
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args ));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Enregistrement des commandes après l'événement 'ready'
client.once('ready', async (client) => {
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Connecté en tant que ${client.user.tag}, nous sommes le ${new Date().toLocaleDateString()} et il est ${new Date().toLocaleTimeString()}`);
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Prêt à écouter les commandes sur ${client.guilds.cache.size} serveurs.`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN as string);

    try {
        console.log('Mise à jour des commandes slash...');
        const commands = client.commands.map(command => command.data.toJSON());
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Chargement 50%.`);

        console.log('Commandes slash enregistrées avec succès.');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des commandes slash :', error);
    }
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Chargement 100%.`);
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Chargement réussi, bot prêt.`);
});

// Connexion du client
client.login(process.env.TOKEN as string);
