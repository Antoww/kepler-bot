import { 
    type CommandInteraction, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits 
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('annonce')
    .setDescription('Fait une annonce avec embed et boutons personnalisés')
    .addStringOption(option => option.setName('titre')
        .setDescription('Le titre de l\'annonce')
        .setRequired(true))
    .addStringOption(option => option.setName('message')
        .setDescription('Le message de l\'annonce')
        .setRequired(true))
    .addStringOption(option => option.setName('couleur')
        .setDescription('La couleur de l\'annonce')
        .setRequired(false)
        .addChoices(
            { name: 'Bleu', value: '#0099ff' },
            { name: 'Vert', value: '#00ff00' },
            { name: 'Rouge', value: '#ff0000' },
            { name: 'Orange', value: '#ffa500' },
            { name: 'Violet', value: '#9b59b6' },
            { name: 'Rose', value: '#e91e63' },
            { name: 'Cyan', value: '#00bcd4' },
            { name: 'Jaune', value: '#ffeb3b' }
        ))
    .addStringOption(option => option.setName('image')
        .setDescription('URL de l\'image à afficher dans l\'embed')
        .setRequired(false))
    .addStringOption(option => option.setName('thumbnail')
        .setDescription('URL de la miniature à afficher dans l\'embed')
        .setRequired(false))
    .addStringOption(option => option.setName('bouton1_texte')
        .setDescription('Texte du premier bouton')
        .setRequired(false))
    .addStringOption(option => option.setName('bouton1_lien')
        .setDescription('Lien du premier bouton')
        .setRequired(false))
    .addStringOption(option => option.setName('bouton1_emoji')
        .setDescription('Emoji du premier bouton (optionnel)')
        .setRequired(false))
    .addStringOption(option => option.setName('bouton2_texte')
        .setDescription('Texte du deuxième bouton')
        .setRequired(false))
    .addStringOption(option => option.setName('bouton2_lien')
        .setDescription('Lien du deuxième bouton')
        .setRequired(false))
    .addStringOption(option => option.setName('bouton2_emoji')
        .setDescription('Emoji du deuxième bouton (optionnel)')
        .setRequired(false))
    .addStringOption(option => option.setName('bouton3_texte')
        .setDescription('Texte du troisième bouton')
        .setRequired(false))
    .addStringOption(option => option.setName('bouton3_lien')
        .setDescription('Lien du troisième bouton')
        .setRequired(false))
    .addStringOption(option => option.setName('bouton3_emoji')
        .setDescription('Emoji du troisième bouton (optionnel)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    // Récupération des options
    const titre = interaction.options.getString('titre')!;
    const message = interaction.options.getString('message')!;
    const color = interaction.options.getString('couleur') || '#0099ff';
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');

    // Récupération des données des boutons
    const bouton1_texte = interaction.options.getString('bouton1_texte');
    const bouton1_lien = interaction.options.getString('bouton1_lien');
    const bouton1_emoji = interaction.options.getString('bouton1_emoji');
    
    const bouton2_texte = interaction.options.getString('bouton2_texte');
    const bouton2_lien = interaction.options.getString('bouton2_lien');
    const bouton2_emoji = interaction.options.getString('bouton2_emoji');
    
    const bouton3_texte = interaction.options.getString('bouton3_texte');
    const bouton3_lien = interaction.options.getString('bouton3_lien');
    const bouton3_emoji = interaction.options.getString('bouton3_emoji');

    // Validation des boutons (si texte fourni, lien obligatoire)
    const boutons = [];
    
    if (bouton1_texte) {
        if (!bouton1_lien) {
            await interaction.reply({ 
                content: '❌ Si vous spécifiez un texte pour le bouton 1, vous devez aussi fournir un lien.',
                ephemeral: true 
            });
            return;
        }
        if (!isValidUrl(bouton1_lien)) {
            await interaction.reply({ 
                content: '❌ Le lien du bouton 1 n\'est pas une URL valide.',
                ephemeral: true 
            });
            return;
        }
    }
    
    if (bouton2_texte) {
        if (!bouton2_lien) {
            await interaction.reply({ 
                content: '❌ Si vous spécifiez un texte pour le bouton 2, vous devez aussi fournir un lien.',
                ephemeral: true 
            });
            return;
        }
        if (!isValidUrl(bouton2_lien)) {
            await interaction.reply({ 
                content: '❌ Le lien du bouton 2 n\'est pas une URL valide.',
                ephemeral: true 
            });
            return;
        }
    }
    
    if (bouton3_texte) {
        if (!bouton3_lien) {
            await interaction.reply({ 
                content: '❌ Si vous spécifiez un texte pour le bouton 3, vous devez aussi fournir un lien.',
                ephemeral: true 
            });
            return;
        }
        if (!isValidUrl(bouton3_lien)) {
            await interaction.reply({ 
                content: '❌ Le lien du bouton 3 n\'est pas une URL valide.',
                ephemeral: true 
            });
            return;
        }
    }

    // Validation des URLs d'images
    if (image && !isValidUrl(image)) {
        await interaction.reply({ 
            content: '❌ L\'URL de l\'image n\'est pas valide.',
            ephemeral: true 
        });
        return;
    }
    
    if (thumbnail && !isValidUrl(thumbnail)) {
        await interaction.reply({ 
            content: '❌ L\'URL de la miniature n\'est pas valide.',
            ephemeral: true 
        });
        return;
    }

    // Création de l'embed
    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.user.username, 
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor(color as any)
        .setTitle(`📢 ${titre}`)
        .setDescription(message)
        .setFooter({
            text: `Demandé par ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    // Ajout conditionnel de l'image et thumbnail
    if (image) {
        embed.setImage(image);
    }
    
    if (thumbnail) {
        embed.setThumbnail(thumbnail);
    }

    // Création des boutons
    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    const buttons: ButtonBuilder[] = [];

    if (bouton1_texte && bouton1_lien) {
        const button1 = new ButtonBuilder()
            .setLabel(bouton1_texte)
            .setStyle(ButtonStyle.Link)
            .setURL(bouton1_lien);
            
        if (bouton1_emoji) {
            button1.setEmoji(bouton1_emoji);
        }
        
        buttons.push(button1);
    }

    if (bouton2_texte && bouton2_lien) {
        const button2 = new ButtonBuilder()
            .setLabel(bouton2_texte)
            .setStyle(ButtonStyle.Link)
            .setURL(bouton2_lien);
            
        if (bouton2_emoji) {
            button2.setEmoji(bouton2_emoji);
        }
        
        buttons.push(button2);
    }

    if (bouton3_texte && bouton3_lien) {
        const button3 = new ButtonBuilder()
            .setLabel(bouton3_texte)
            .setStyle(ButtonStyle.Link)
            .setURL(bouton3_lien);
            
        if (bouton3_emoji) {
            button3.setEmoji(bouton3_emoji);
        }
        
        buttons.push(button3);
    }

    // Ajout des boutons dans un ActionRow si il y en a
    if (buttons.length > 0) {
        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(...buttons);
        components.push(actionRow);
    }

    // Envoi de la réponse
    const responseOptions: {
        embeds: EmbedBuilder[];
        components?: ActionRowBuilder<ButtonBuilder>[];
    } = { embeds: [embed] };
    
    if (components.length > 0) {
        responseOptions.components = components;
    }

    await interaction.reply(responseOptions);
}

// Fonction utilitaire pour valider les URLs
function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
} 