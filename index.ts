import * as path from "jsr:@std/path";
import type { Event, Command } from './types.d.ts';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { logger } from './utils/logger.ts';

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
async function loadCommands(dirPath: string, category: string = 'general') {
    for (const entry of Deno.readDirSync(dirPath)) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory) {
            // Récursivement charger les sous-dossiers avec la catégorie mise à jour
            await loadCommands(fullPath, entry.name);
        } else if (entry.isFile && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
            // Charger les fichiers de commandes
            try {
                const command = await import(`file:${fullPath}`) as Command;
                
                if (command.data && command.data.name) {
                    // Créer un nouvel objet avec la propriété category
                    const commandWithCategory = {
                        ...command,
                        category: category
                    };
                    client.commands.set(command.data.name, commandWithCategory);
                    logger.debug(`Commande chargée: ${command.data.name} (${category})`, undefined, 'LOADER');
                } else {
                    logger.error(`Commande invalide dans ${fullPath}`, undefined, 'LOADER');
                }
            } catch (error) {
                logger.error(`Erreur lors du chargement de ${fullPath}`, error, 'LOADER');
            }
        }
    }
}

// Fonction pour charger les événements récursivement
async function loadEvents() {
    // Liste des événements réels à charger (vérifier qu'ils existent)
    const eventFiles = [
        'events/core/ready.ts',
        'events/core/interactionCreate.ts',
        'events/handlers/channelCreate.ts',
        'events/handlers/channelDelete.ts',
        'events/handlers/channelUpdate.ts',
        'events/handlers/emojiCreate.ts',
        'events/handlers/emojiDelete.ts',
        'events/handlers/emojiUpdate.ts',
        'events/handlers/guildBanAdd.ts',
        'events/handlers/guildBanRemove.ts',
        'events/handlers/guildMemberAdd.ts',
        'events/handlers/guildMemberRemove.ts',
        'events/handlers/guildMemberUpdate.ts',
        'events/handlers/guildUpdate.ts',
        'events/handlers/inviteCreate.ts',
        'events/handlers/inviteDelete.ts',
        'events/handlers/messageCreate.ts',
        'events/handlers/messageDelete.ts',
        'events/handlers/messageDeleteBulk.ts',
        'events/handlers/messageUpdate.ts',
        'events/handlers/roleCreate.ts',
        'events/handlers/roleDelete.ts',
        'events/handlers/roleUpdate.ts',
        'events/handlers/stickerCreate.ts',
        'events/handlers/stickerDelete.ts',
        'events/handlers/voiceStateUpdate.ts'
    ];

    for (const eventFile of eventFiles) {
        const fullPath = path.join(Deno.cwd(), eventFile);
        try {
            const event = await import(`file:${fullPath}`) as Event;
            
            if (event && 'name' in event && 'execute' in event) {
                if ('once' in event && event.once) {
                    client.once(event.name as any, (...args: any[]) => (event.execute as any)(...args));
                } else {
                    client.on(event.name as any, (...args: any[]) => (event.execute as any)(...args));
                }
                logger.debug(`Événement chargé: ${event.name}`, undefined, 'LOADER');
            } else {
                logger.error(`Événement invalide dans ${eventFile}`, undefined, 'LOADER');
            }
        } catch (error) {
            logger.error(`Erreur lors du chargement de ${eventFile}`, error, 'LOADER');
        }
    }
}

// Chargement des commandes
const commandsPath = path.join(Deno.cwd(), 'commands');
await loadCommands(commandsPath);

// Chargement des événements
await loadEvents();

// Connexion du client
client.login(Deno.env.get('TOKEN') as string);
