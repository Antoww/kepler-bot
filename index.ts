import * as path from "jsr:@std/path";
import type { Event, Command } from './types.d.ts';
import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
import { initDatabase } from './database/supabase.ts';
import { BirthdayManager } from './events/core/birthdayManager.ts';
import { ModerationManager } from './events/core/moderationManager.ts';
import { RGPDManager } from './events/core/rgpdManager.ts';
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
                    logger.debug(`Commande chargée: ${command.data.name}`, undefined, 'LOADER');
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

// Enregistrement des commandes après l'événement 'ready'
client.once('ready', async (client) => {
    logger.success(`Bot connecté: ${client.user.tag}`, undefined, 'BOT');
    logger.info(`Prêt sur ${client.guilds.cache.size} serveur(s)`, undefined, 'BOT');

    // Initialiser la base de données
    try {
        await initDatabase();
        logger.success('Base de données initialisée', undefined, 'DATABASE');
    } catch (error) {
        logger.error('Erreur initialisation base de données', error, 'DATABASE');
    }

    // Initialiser le gestionnaire d'anniversaires
    const birthdayManager = new BirthdayManager(client);
    birthdayManager.startBirthdayCheck();
    logger.success('Gestionnaire d\'anniversaires démarré', undefined, 'MANAGER');

    // Initialiser le gestionnaire de modération
    const moderationManager = new ModerationManager(client);
    moderationManager.start();
    logger.success('Gestionnaire de modération démarré', undefined, 'MANAGER');

    // Initialiser le gestionnaire RGPD (purge automatique des données anciennes)
    const rgpdManager = new RGPDManager();
    rgpdManager.start();
    logger.success('Gestionnaire RGPD démarré (90 jours)', undefined, 'MANAGER');

    const rest = new REST({ version: '10' }).setToken(Deno.env.get('TOKEN') as string);

    try {
        const commands = client.commands.map(command => command.data.toJSON());
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        logger.success(`${commands.length} commande(s) slash enregistrée(s)`, undefined, 'BOT');
    } catch (error) {
        logger.error('Erreur enregistrement commandes slash', error, 'BOT');
    }
    logger.success('Bot prêt !', undefined, 'BOT');
});

// Connexion du client
client.login(Deno.env.get('TOKEN') as string);
