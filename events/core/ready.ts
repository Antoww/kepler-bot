import { type Client } from 'discord.js';
import { REST, Routes } from 'discord.js';
import version from '../../version.json' with { type: 'json' };
import { initializeGiveaways } from '../../managers/giveawayManager.ts';
import { logger } from '../../utils/logger.ts';
import { initDatabase } from '../../database/supabase.ts';
import { BirthdayManager } from '../../managers/birthdayManager.ts';
import { ModerationManager } from '../../managers/moderationManager.ts';
import { RGPDManager } from '../../managers/rgpdManager.ts';
import { XpManager } from '../../managers/xpManager.ts';
import { ReminderManager } from '../../managers/reminderManager.ts';
import { InviteManager } from '../../managers/inviteManager.ts';
import { configureKeplerEmbedIdentity } from '../../utils/theme.ts';

export const name = 'ready';
export const once = true;

export async function execute(client: Client<true>) {
    configureKeplerEmbedIdentity(client.user);

    logger.success(`Bot connecté: ${client.user.tag}`, undefined, 'BOT');
    logger.info(`Prêt sur ${client.guilds.cache.size} serveur(s)`, undefined, 'BOT');
    
    // Définir le statut du bot avec la version depuis version.json
    client.user.setActivity(`v${version.version} • ${version.codename}`, { type: 3 }); // Type 3 = Watching
    
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
    client.moderationManager = moderationManager;
    await moderationManager.start();
    logger.success('Gestionnaire de modération démarré', undefined, 'MANAGER');

    // Initialiser le gestionnaire RGPD (purge automatique des données anciennes)
    const rgpdManager = new RGPDManager();
    rgpdManager.start();
    logger.success('Gestionnaire RGPD démarré (90 jours)', undefined, 'MANAGER');

    const xpManager = new XpManager(client);
    xpManager.start();
    logger.success('Gestionnaire XP démarré', undefined, 'MANAGER');

    const reminderManager = new ReminderManager(client);
    client.reminderManager = reminderManager;
    await reminderManager.start();
    logger.success('Gestionnaire de rappels démarré', undefined, 'MANAGER');

    const inviteManager = new InviteManager(client);
    client.inviteManager = inviteManager;
    await inviteManager.start();
    logger.success('Gestionnaire d’invitations démarré', undefined, 'MANAGER');

    // Enregistrer les commandes slash
    const rest = new REST({ version: '10' }).setToken(Deno.env.get('TOKEN') as string);
    try {
        logger.debug(`client.commands contient ${(client as any).commands.size} commandes`, undefined, 'BOT');
        const commands = (client as any).commands.map((command: any) => command.data.toJSON());
        logger.debug(`Enregistrement de ${commands.length} commandes...`, undefined, 'BOT');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        logger.success(`${commands.length} commande(s) slash enregistrée(s)`, undefined, 'BOT');
    } catch (error) {
        logger.error('Erreur enregistrement commandes slash', error, 'BOT');
    }
    
    // Initialiser les giveaways
    try {
        await initializeGiveaways(client);
    } catch (error) {
        logger.error('Erreur initialisation giveaways', error, 'Giveaway');
    }
    
    logger.success('Bot prêt !', undefined, 'BOT');
}
