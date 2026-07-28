import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import {
    type CommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';
import version from '../../version.json' with { type: 'json' };
import { logger } from '../../utils/logger.ts';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche l\'aide et la liste des commandes disponibles');

interface CommandInfo {
    name: string;
    description: string;
    category: string;
    id?: string | null;
}

// Fonction pour récupérer toutes les commandes depuis client.commands
function getAllCommands(client: any): CommandInfo[] {
    const commands: CommandInfo[] = [];

    // Catégories basées sur la structure des dossiers
    const categoryMap: Record<string, string> = {
        'administration': 'administration',
        'moderation': 'moderation',
        'games': 'games',
        'utilitaires': 'utilitaires',
        'general': 'general'
    };

    try {
        // Utiliser les commandes déjà chargées dans client.commands
        client.commands.forEach((command: any) => {
            // Déterminer la catégorie depuis la propriété category ou depuis le nom du fichier
            let category = command.category || 'general';

            commands.push({
                name: command.data.name,
                description: command.data.description || 'Aucune description disponible',
                category: category
            });
        });

        logger.debug(`${commands.length} commande(s) chargée(s) depuis client.commands`, undefined, 'Help');
    } catch (error) {
        logger.error('Erreur récupération commandes', error, 'Help');
    }

    return commands;
}

// Fonction pour créer l'embed du menu principal
function createMainMenuEmbed(client: any): EmbedBuilder {
    return createKeplerEmbed()
        .setAuthor({
            name: client.user?.username || 'Kepler Bot',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.primary)
        .setTitle('📚 Menu d\'aide - Kepler Bot')
        .setDescription(
            '**Bienvenue dans le menu d\'aide !**\n\n' +
            'Ce bot dispose de nombreuses commandes organisées par catégories. ' +
            'Utilisez le menu déroulant ci-dessous pour explorer les différentes catégories de commandes disponibles.\n\n' +
            '**Catégories disponibles :**\n' +
            '🔧 **Administration** - Commandes de gestion du serveur\n' +
            '🛡️ **Modération** - Outils de modération\n' +
            '🎮 **Jeux** - Commandes de divertissement\n' +
            '⚙️ **Utilitaires** - Outils pratiques\n' +
            '📋 **Général** - Commandes générales\n\n' +
            '*Sélectionnez une catégorie pour voir les commandes disponibles.*'
        )
        .setFooter({ text: `v${version.version} • ${version.codename}` })
        .setTimestamp();
}

// Fonction pour créer l'embed d'une catégorie avec pagination
function createCategoryEmbed(client: any, commands: CommandInfo[], category: string, page: number = 0): EmbedBuilder {
    const itemsPerPage = 10;
    const startIndex = page * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageCommands = commands.slice(startIndex, endIndex);
    const totalPages = Math.ceil(commands.length / itemsPerPage);

    const categoryEmojis: { [key: string]: string } = {
        'administration': '🔧',
        'moderation': '🛡️',
        'games': '🎮',
        'utilitaires': '⚙️',
        'general': '📋'
    };

    const categoryNames: { [key: string]: string } = {
        'administration': 'Administration',
        'moderation': 'Modération',
        'games': 'Jeux',
        'utilitaires': 'Utilitaires',
        'general': 'Général'
    };

    const emoji = categoryEmojis[category] || '📋';
    const displayName = categoryNames[category] || category;

    const embed = createKeplerEmbed()
        .setAuthor({
            name: client.user?.username || 'Kepler Bot',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.primary)
        .setTitle(`${emoji} Commandes - ${displayName}`)
        .setDescription(
            pageCommands.length > 0
                ? pageCommands.map(cmd => {
                    // Si on a l'ID de la commande, créer un lien cliquable
                    if (cmd.id) {
                        const cmdLink = `</${cmd.name}:${cmd.id}>`;
                        logger.info(`Lien créé: "${cmdLink}" pour ${cmd.name}`, undefined, 'Help');
                        return `${cmdLink} - ${cmd.description}`;
                    } else {
                        logger.warn(`Pas d'ID pour ${cmd.name}, affichage texte simple`, undefined, 'Help');
                        return `**/${cmd.name}** - ${cmd.description}`;
                    }
                }).join('\n')
                : 'Aucune commande trouvée dans cette catégorie.'
        );

    if (totalPages > 1) {
        embed.setFooter({ text: `Page ${page + 1}/${totalPages} • ${commands.length} commande(s) au total` });
    } else {
        embed.setFooter({ text: `${commands.length} commande(s) au total` });
    }

    embed.setTimestamp();

    return embed;
}

// Fonction pour créer le menu de sélection des catégories
function createCategorySelectMenu(): ActionRowBuilder<StringSelectMenuBuilder> {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Choisissez une catégorie...')
        .addOptions([
            {
                label: 'Administration',
                description: 'Commandes de gestion du serveur',
                value: 'administration',
                emoji: '🔧'
            },
            {
                label: 'Modération',
                description: 'Outils de modération',
                value: 'moderation',
                emoji: '🛡️'
            },
            {
                label: 'Jeux',
                description: 'Commandes de divertissement',
                value: 'games',
                emoji: '🎮'
            },
            {
                label: 'Utilitaires',
                description: 'Outils pratiques',
                value: 'utilitaires',
                emoji: '⚙️'
            },
            {
                label: 'Général',
                description: 'Commandes générales',
                value: 'general',
                emoji: '📋'
            }
        ]);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

// Fonction pour créer les boutons de navigation
function createNavigationButtons(currentPage: number, totalPages: number, category: string): ActionRowBuilder<ButtonBuilder> {
    const buttons: ButtonBuilder[] = [];

    // Bouton page précédente
    if (currentPage > 0) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`help_prev_${category}_${currentPage - 1}`)
                .setLabel('◀️')
                .setStyle(ButtonStyle.Primary)
        );
    }

    // Bouton retour au menu principal
    buttons.push(
        new ButtonBuilder()
            .setCustomId('help_main_menu')
            .setLabel('🏠')
            .setStyle(ButtonStyle.Secondary)
    );

    // Bouton page suivante
    if (currentPage < totalPages - 1) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`help_next_${category}_${currentPage + 1}`)
                .setLabel('▶️')
                .setStyle(ButtonStyle.Primary)
        );
    }

    // Bouton fermer (toujours en dernier)
    buttons.push(
        new ButtonBuilder()
            .setCustomId('help_close')
            .setLabel('❌')
            .setStyle(ButtonStyle.Danger)
    );

    return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

export async function execute(interaction: CommandInteraction) {
    try {
        // Récupérer toutes les commandes depuis le client
        const allCommands = getAllCommands(interaction.client);
        logger.info(`Total commandes récupérées: ${allCommands.length}`, undefined, 'Help');

        // Log des commandes par catégorie
        const categoryCounts: Record<string, number> = {};
        allCommands.forEach(cmd => {
            categoryCounts[cmd.category] = (categoryCounts[cmd.category] || 0) + 1;
        });
        logger.info(`Commandes par catégorie: ${JSON.stringify(categoryCounts)}`, undefined, 'Help');

        // Récupérer les commandes slash enregistrées avec leurs IDs
        let applicationCommands;
        try {
            // Essayer d'abord les commandes globales
            applicationCommands = await interaction.client.application?.commands.fetch();
            logger.info(`${applicationCommands?.size || 0} commandes API récupérées`, undefined, 'Help');

            // Si on est dans une guild, essayer aussi les commandes de guild
            if (interaction.guild && applicationCommands) {
                try {
                    const guildCommands = await interaction.guild.commands.fetch();
                    logger.info(`${guildCommands.size} commandes de guild récupérées`, undefined, 'Help');

                    // Fusionner les deux collections
                    guildCommands.forEach(cmd => applicationCommands?.set(cmd.id, cmd));
                } catch (guildError) {
                    logger.warn('Impossible de récupérer les commandes de guild', guildError, 'Help');
                }
            }
        } catch (error) {
            logger.error('Erreur récupération commandes', error, 'Help');
            applicationCommands = new Map();
        }

        // Mapper les commandes avec leurs IDs réels
        let idsFound = 0;
        let idsMissing = 0;
        const commandsWithIds = allCommands.map(cmd => {
            const registeredCommand = applicationCommands?.find(appCmd => appCmd.name === cmd.name);
            if (registeredCommand) {
                idsFound++;
            } else {
                idsMissing++;
                logger.warn(`Commande ${cmd.name} n'a pas d'ID trouvé dans l'API`, undefined, 'Help');
            }
            return {
                ...cmd,
                id: registeredCommand?.id || null
            };
        });
        logger.info(`IDs trouvés: ${idsFound}/${allCommands.length}`, undefined, 'Help');

        // Créer et envoyer le menu principal
        const mainEmbed = createMainMenuEmbed(interaction.client);
        const categorySelect = createCategorySelectMenu();

        const response = await interaction.reply({
            embeds: [mainEmbed],
            components: [
                categorySelect,
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_close')
                        .setLabel('❌')
                        .setStyle(ButtonStyle.Danger)
                )
            ],
            ephemeral: true
        });

        // Créer un collecteur pour les interactions
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000 // 5 minutes
        });

        const buttonCollector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutes
        });

        // Gérer les sélections de catégories
        collector.on('collect', async (selectInteraction) => {
            if (selectInteraction.user.id !== interaction.user.id) {
                await selectInteraction.reply({
                    content: KEPLER_MESSAGES.unauthorizedComponent,
                    ephemeral: true
                });
                return;
            }

            const selectedCategory = selectInteraction.values[0];
            const categoryCommands = commandsWithIds.filter(cmd => cmd.category === selectedCategory);
            const totalPages = Math.ceil(categoryCommands.length / 10);

            logger.info(`Catégorie sélectionnée: ${selectedCategory}, ${categoryCommands.length} commandes, ${totalPages} page(s)`, undefined, 'Help');

            const categoryEmbed = createCategoryEmbed(interaction.client, categoryCommands, selectedCategory, 0);
            const components = [createCategorySelectMenu()];

            if (totalPages > 1) {
                components.push(createNavigationButtons(0, totalPages, selectedCategory));
            } else {
                // Ajouter seulement le bouton retour au menu principal et fermer
                components.push(
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId('help_main_menu')
                            .setLabel('🏠')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('help_close')
                            .setLabel('❌')
                            .setStyle(ButtonStyle.Danger)
                    )
                );
            }

            await selectInteraction.update({
                embeds: [categoryEmbed],
                components: components
            });
        });

        // Gérer les boutons de navigation
        buttonCollector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({
                    content: KEPLER_MESSAGES.unauthorizedComponent,
                    ephemeral: true
                });
                return;
            }

            const customId = buttonInteraction.customId;

            if (customId === 'help_main_menu') {
                // Retour au menu principal
                const mainEmbed = createMainMenuEmbed(interaction.client);
                const categorySelect = createCategorySelectMenu();

                await buttonInteraction.update({
                    embeds: [mainEmbed],
                    components: [
                        categorySelect,
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId('help_close')
                                .setLabel('❌')
                                .setStyle(ButtonStyle.Danger)
                        )
                    ]
                });
            } else if (customId === 'help_close') {
                // Fermer le menu
                await buttonInteraction.update({
                    content: '✅ Menu d\'aide fermé.',
                    embeds: [],
                    components: []
                });
            } else if (customId.startsWith('help_prev_') || customId.startsWith('help_next_')) {
                // Navigation entre les pages
                const parts = customId.split('_');
                const category = parts[2];
                const page = parseInt(parts[3]);

                const categoryCommands = commandsWithIds.filter(cmd => cmd.category === category);
                const totalPages = Math.ceil(categoryCommands.length / 10);

                const categoryEmbed = createCategoryEmbed(interaction.client, categoryCommands, category, page);
                const components = [createCategorySelectMenu()];

                if (totalPages > 1) {
                    components.push(createNavigationButtons(page, totalPages, category));
                } else {
                    components.push(
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId('help_main_menu')
                                .setLabel('🏠')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('help_close')
                                .setLabel('❌')
                                .setStyle(ButtonStyle.Danger)
                        )
                    );
                }

                await buttonInteraction.update({
                    embeds: [categoryEmbed],
                    components: components
                });
            }
        });

        // Gérer la fin du collecteur
        collector.on('end', async () => {
            try {
                const disabledSelect = createCategorySelectMenu();
                disabledSelect.components[0].setDisabled(true);

                await response.edit({
                    components: [disabledSelect]
                });
            } catch (error) {
                console.error('Erreur lors de la désactivation des composants:', error);
            }
        });

        buttonCollector.on('end', async () => {
            try {
                // Les boutons seront déjà désactivés par le collecteur principal
            } catch (error) {
                console.error('Erreur lors de la désactivation des boutons:', error);
            }
        });

    } catch (error) {
        console.error('Erreur dans la commande help:', error);

        const errorEmbed = createKeplerEmbed()
            .setColor(KEPLER_COLORS.danger)
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du chargement de l\'aide.')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}
