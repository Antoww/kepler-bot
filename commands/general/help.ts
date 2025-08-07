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

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche l\'aide et la liste des commandes disponibles');

interface CommandInfo {
    name: string;
    description: string;
    category: string;
    id?: string | null;
}

// Fonction pour charger toutes les commandes automatiquement
async function getAllCommands(): Promise<CommandInfo[]> {
    const commands: CommandInfo[] = [];
    
    async function loadCommandsFromDir(dirPath: string, category: string) {
        try {
            for (const entry of Deno.readDirSync(dirPath)) {
                const fullPath = dirPath + '/' + entry.name;
                
                if (entry.isDirectory) {
                    // Récursivement charger les sous-dossiers
                    await loadCommandsFromDir(fullPath, entry.name);
                } else if (entry.isFile && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
                    try {
                        const command = await import(`file://${fullPath}`);
                        
                        if (command.data && command.data.name) {
                            commands.push({
                                name: command.data.name,
                                description: command.data.description || 'Aucune description disponible',
                                category: category
                            });
                        }
                    } catch (error) {
                        console.error(`Erreur lors du chargement de ${fullPath}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error(`Erreur lors de la lecture du dossier ${dirPath}:`, error);
        }
    }
    
    const commandsPath = Deno.cwd() + '/commands';
    
    // Charger chaque dossier de catégorie
    try {
        for (const entry of Deno.readDirSync(commandsPath)) {
            if (entry.isDirectory) {
                await loadCommandsFromDir(commandsPath + '/' + entry.name, entry.name);
            }
        }
    } catch (error) {
        console.error(`Erreur lors de la lecture du dossier commands:`, error);
    }
    
    return commands;
}

// Fonction pour créer l'embed du menu principal
function createMainMenuEmbed(client: any): EmbedBuilder {
    return new EmbedBuilder()
        .setAuthor({ 
            name: client.user?.username || 'Kepler Bot', 
            iconURL: client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
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
        .setFooter({ text: 'Utilisez le menu déroulant pour naviguer' })
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
    
    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: client.user?.username || 'Kepler Bot', 
            iconURL: client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
        .setTitle(`${emoji} Commandes - ${displayName}`)
        .setDescription(
            pageCommands.length > 0 
                ? pageCommands.map(cmd => {
                    // Si on a l'ID de la commande, créer un lien cliquable
                    if (cmd.id) {
                        return `</${cmd.name}:${cmd.id}> - ${cmd.description}`;
                    } else {
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
                .setLabel('Précédent')
                .setStyle(ButtonStyle.Primary)
        );
    }
    
    // Bouton retour au menu principal
    buttons.push(
        new ButtonBuilder()
            .setCustomId('help_main_menu')
            .setLabel('Menu')
            .setStyle(ButtonStyle.Secondary)
    );
    
    // Bouton page suivante
    if (currentPage < totalPages - 1) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`help_next_${category}_${currentPage + 1}`)
                .setLabel('Suivant')
                .setStyle(ButtonStyle.Primary)
        );
    }
    
    // Bouton fermer (toujours en dernier)
    buttons.push(
        new ButtonBuilder()
            .setCustomId('help_close')
            .setLabel('Fermer')
            .setStyle(ButtonStyle.Danger)
    );
    
    return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

export async function execute(interaction: CommandInteraction) {
    try {
        // Charger toutes les commandes automatiquement
        const allCommands = await getAllCommands();
        
        // Récupérer les commandes slash enregistrées avec leurs IDs
        let applicationCommands;
        try {
            applicationCommands = await interaction.client.application?.commands.fetch();
        } catch (error) {
            console.error('Erreur lors de la récupération des commandes:', error);
            applicationCommands = new Map();
        }
        
        // Mapper les commandes avec leurs IDs réels
        const commandsWithIds = allCommands.map(cmd => {
            const registeredCommand = applicationCommands?.find(appCmd => appCmd.name === cmd.name);
            return {
                ...cmd,
                id: registeredCommand?.id || null
            };
        });
        
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
                        .setLabel('Fermer')
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
                    content: '❌ Vous ne pouvez pas utiliser ce menu.', 
                    ephemeral: true 
                });
                return;
            }
            
            const selectedCategory = selectInteraction.values[0];
            const categoryCommands = commandsWithIds.filter(cmd => cmd.category === selectedCategory);
            const totalPages = Math.ceil(categoryCommands.length / 10);
            
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
                            .setLabel('Menu')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('help_close')
                            .setLabel('Fermer')
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
                    content: '❌ Vous ne pouvez pas utiliser ce bouton.', 
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
                                .setLabel('Fermer')
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
                                .setLabel('Menu')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('help_close')
                                .setLabel('Fermer')
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
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
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
