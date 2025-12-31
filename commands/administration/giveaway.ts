import { 
    type CommandInteraction, 
    SlashCommandBuilder, 
    ChannelType,
    PermissionFlagsBits,
    type ChatInputCommandInteraction,
    EmbedBuilder,
    TextChannel
} from 'discord.js';
import {
    createGiveaway,
    getGiveaway,
    deleteGiveaway
} from '../../database/db.ts';
import {
    scheduleGiveaway,
    cancelGiveaway,
    endGiveawayNow,
    generateGiveawayEmbed,
    createGiveawayButtons,
    formatTimeRemaining
} from '../../events/core/giveawayManager.ts';

export const data = new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gère les giveaways du serveur')
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Crée un nouveau giveaway')
            .addChannelOption(option => option.setName('salon')
                .setDescription('Le salon où envoyer le giveaway')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
            .addStringOption(option => option.setName('titre')
                .setDescription('Le titre du giveaway')
                .setRequired(true))
            .addIntegerOption(option => option.setName('quantite')
                .setDescription('Nombre de gagnants')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
            .addStringOption(option => option.setName('recompense')
                .setDescription('Description de la récompense')
                .setRequired(true))
            .addStringOption(option => option.setName('duree')
                .setDescription('Durée du giveaway (ex: 1h, 30m, 2d, 3s)')
                .setRequired(true))
            .addRoleOption(option => option.setName('role')
                .setDescription('Rôle requis pour participer (optionnel)')
                .setRequired(false)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('cancel')
            .setDescription('Annule un giveaway')
            .addStringOption(option => option.setName('id')
                .setDescription('L\'ID du giveaway à annuler')
                .setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('end')
            .setDescription('Termine immédiatement un giveaway')
            .addStringOption(option => option.setName('id')
                .setDescription('L\'ID du giveaway à terminer')
                .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('❌ Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    // Vérifier les permissions
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: '❌ Vous devez être administrateur pour utiliser cette commande.',
            ephemeral: true
        });
        return;
    }

    const subcommand = (interaction as ChatInputCommandInteraction).options.getSubcommand();

    try {
        switch (subcommand) {
            case 'create':
                await handleCreateGiveaway(interaction);
                break;
            case 'cancel':
                await handleCancelGiveaway(interaction);
                break;
            case 'end':
                await handleEndGiveaway(interaction);
                break;
        }
    } catch (error) {
        console.error('Erreur lors de l\'exécution de la commande giveaway:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
            ephemeral: true
        });
    }
}

async function handleCreateGiveaway(interaction: CommandInteraction) {
    await interaction.deferReply();

    const channel = (interaction as ChatInputCommandInteraction).options.getChannel('salon') as TextChannel;
    const titre = (interaction as ChatInputCommandInteraction).options.getString('titre')!;
    const quantite = (interaction as ChatInputCommandInteraction).options.getInteger('quantite')!;
    const role = (interaction as ChatInputCommandInteraction).options.getRole('role');
    const duree = (interaction as ChatInputCommandInteraction).options.getString('duree');
    const recompense = (interaction as ChatInputCommandInteraction).options.getString('recompense')!;

    // Parser la durée
    const endTime = parseDuration(duree || '1h');
    if (!endTime) {
        await interaction.editReply('❌ Format de durée invalide. Utilisez: 1s, 30m, 2h, 1d');
        return;
    }

    // Vérifier que le bot a accès au canal
    if (!channel.permissionsFor(interaction.guild!.members.me!).has('SendMessages')) {
        await interaction.editReply(`❌ Je n'ai pas la permission d'envoyer des messages dans ${channel}`);
        return;
    }

    // Générer un ID unique pour le giveaway
    const giveawayId = Date.now().toString();

    try {
        // Créer le giveaway en base de données
        await createGiveaway(
            giveawayId,
            interaction.guild!.id,
            channel.id,
            '', // Le message_id sera mis à jour après
            titre,
            quantite,
            recompense,
            role?.id,
            endTime
        );

        // Créer et envoyer l'embed
        const embed = generateGiveawayEmbed(
            { id: giveawayId, title: titre, reward: recompense, quantity: quantite, role_id: role?.id, end_time: endTime },
            0,
            formatTimeRemaining(endTime)
        );

        const buttons = createGiveawayButtons();

        const message = await channel.send({
            embeds: [embed],
            components: [buttons]
        });

        // Mettre à jour le message_id en base de données
        const { error } = await (await import('../../database/supabase.ts')).supabase
            .from('giveaways')
            .update({ message_id: message.id })
            .eq('id', giveawayId);

        if (error) throw error;

        // Planifier le giveaway
        scheduleGiveaway(interaction.client, giveawayId, endTime);

        // Répondre à l'utilisateur
        const confirmEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Giveaway créé')
            .addFields(
                { name: 'Titre', value: titre, inline: true },
                { name: 'Salon', value: `${channel}`, inline: true },
                { name: 'Gagnants', value: `${quantite}`, inline: true },
                { name: 'Récompense', value: recompense, inline: false },
                { name: 'ID', value: `\`${giveawayId}\``, inline: false }
            );

        if (role) {
            confirmEmbed.addFields(
                { name: 'Rôle requis', value: `${role}`, inline: true }
            );
        }

        await interaction.editReply({ embeds: [confirmEmbed] });
    } catch (error) {
        console.error('Erreur lors de la création du giveaway:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de la création du giveaway.');
    }
}

async function handleCancelGiveaway(interaction: CommandInteraction) {
    await interaction.deferReply();

    const giveawayId = (interaction as ChatInputCommandInteraction).options.getString('id')!;

    try {
        // Récupérer le giveaway
        const giveaway = await getGiveaway(giveawayId);
        if (!giveaway) {
            await interaction.editReply('❌ Giveaway non trouvé.');
            return;
        }

        // Vérifier que le giveaway appartient à ce serveur
        if (giveaway.guild_id !== interaction.guild!.id) {
            await interaction.editReply('❌ Ce giveaway n\'appartient pas à ce serveur.');
            return;
        }

        // Annuler le giveaway
        await cancelGiveaway(interaction.client, giveawayId);

        const confirmEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('✅ Giveaway annulé')
            .setDescription(`Le giveaway **${giveaway.title}** a été annulé.`)
            .addFields(
                { name: 'ID', value: `\`${giveawayId}\``, inline: false }
            );

        await interaction.editReply({ embeds: [confirmEmbed] });
    } catch (error) {
        console.error('Erreur lors de l\'annulation du giveaway:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de l\'annulation du giveaway.');
    }
}

async function handleEndGiveaway(interaction: CommandInteraction) {
    await interaction.deferReply();

    const giveawayId = (interaction as ChatInputCommandInteraction).options.getString('id')!;

    try {
        // Récupérer le giveaway
        const giveaway = await getGiveaway(giveawayId);
        if (!giveaway) {
            await interaction.editReply('❌ Giveaway non trouvé.');
            return;
        }

        // Vérifier que le giveaway appartient à ce serveur
        if (giveaway.guild_id !== interaction.guild!.id) {
            await interaction.editReply('❌ Ce giveaway n\'appartient pas à ce serveur.');
            return;
        }

        // Terminer le giveaway
        await endGiveawayNow(interaction.client, giveawayId);

        const confirmEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Giveaway terminé')
            .setDescription(`Le giveaway **${giveaway.title}** a été terminé immédiatement.`)
            .addFields(
                { name: 'ID', value: `\`${giveawayId}\``, inline: false }
            );

        await interaction.editReply({ embeds: [confirmEmbed] });
    } catch (error) {
        console.error('Erreur lors de la terminaison du giveaway:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de la terminaison du giveaway.');
    }
}

function parseDuration(duration: string): Date | null {
    const regex = /^(\d+)([smhd])$/i;
    const match = duration.toLowerCase().match(regex);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    let ms = 0;
    switch (unit) {
        case 's':
            ms = value * 1000;
            break;
        case 'm':
            ms = value * 60 * 1000;
            break;
        case 'h':
            ms = value * 60 * 60 * 1000;
            break;
        case 'd':
            ms = value * 24 * 60 * 60 * 1000;
            break;
        default:
            return null;
    }

    return new Date(Date.now() + ms);
}
