import * as path from "jsr:@std/path";
import type { Event, Command } from './types.d.ts';
import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
import { initDatabase } from './database/supabase.ts';
import { BirthdayManager } from './events/core/birthdayManager.ts';
import { ModerationManager } from './events/core/moderationManager.ts';

// Initialisation du client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildEmojisAndStickers
    ] 
});

// Collection des commandes
client.commands = new Collection();

// Fonction pour charger les commandes récursivement
async function loadCommands(dirPath: string) {
    for (const entry of Deno.readDirSync(dirPath)) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory) {
            // Récursivement charger les sous-dossiers
            await loadCommands(fullPath);
        } else if (entry.isFile && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
            // Charger les fichiers de commandes
            try {
                const command = await import(`file:${fullPath}`) as Command;
                
                if (command.data && command.data.name) {
                    client.commands.set(command.data.name, command);
                    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande chargée : ${command.data.name} (${fullPath})`);
                } else {
                    console.error(`[LOG : ${new Date().toLocaleDateString()}] La commande dans ${fullPath} n'a pas de propriété 'data' ou 'name' définie.`);
                }
            } catch (error) {
                console.error(`[LOG : ${new Date().toLocaleDateString()}] Erreur lors du chargement de ${fullPath}:`, error);
            }
        }
    }
}

// Fonction pour charger les événements récursivement
async function loadEvents(dirPath: string) {
    for (const entry of Deno.readDirSync(dirPath)) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory) {
            // Récursivement charger les sous-dossiers
            await loadEvents(fullPath);
        } else if (entry.isFile && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
            // Charger les fichiers d'événements
            try {
                const event = await import(`file:${fullPath}`) as Event;
                
                if (event.name && event.execute) {
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args));
                    }
                    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Événement chargé : ${event.name} (${fullPath})`);
                } else {
                    console.error(`[LOG : ${new Date().toLocaleDateString()}] L'événement dans ${fullPath} n'a pas de propriété 'name' ou 'execute' définie.`);
                }
            } catch (error) {
                console.error(`[LOG : ${new Date().toLocaleDateString()}] Erreur lors du chargement de ${fullPath}:`, error);
            }
        }
    }
}

// Chargement des commandes
const commandsPath = path.join(Deno.cwd(), 'commands');
await loadCommands(commandsPath);

// Chargement des événements
const eventsPath = path.join(Deno.cwd(), 'events');
await loadEvents(eventsPath);

// Enregistrement des commandes après l'événement 'ready'
client.once('ready', async (client) => {
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Connecté en tant que ${client.user.tag}, nous sommes le ${new Date().toLocaleDateString()} et il est ${new Date().toLocaleTimeString()}`);
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Prêt à écouter les commandes sur ${client.guilds.cache.size} serveurs.`);

    // Initialiser la base de données
    try {
        await initDatabase();
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Base de données initialisée avec succès.`);
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
    }

    // Initialiser le gestionnaire d'anniversaires
    const birthdayManager = new BirthdayManager(client);
    birthdayManager.startBirthdayCheck();
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Gestionnaire d'anniversaires initialisé.`);

    // Initialiser le gestionnaire de modération
    const moderationManager = new ModerationManager(client);
    moderationManager.start();
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Gestionnaire de modération initialisé.`);

    const rest = new REST({ version: '10' }).setToken(Deno.env.get('TOKEN') as string);

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
client.login(Deno.env.get('TOKEN') as string);
