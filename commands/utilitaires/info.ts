import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder, ChannelType } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('info')
    .setDescription('Affiche des informations diverses')
    .addSubcommand(subcommand =>
        subcommand
            .setName('server')
            .setDescription('Affiche les informations du serveur'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('user')
            .setDescription('Affiche les informations d\'un utilisateur')
            .addUserOption(option => option.setName('utilisateur')
                .setDescription('L\'utilisateur dont vous voulez voir les informations')
                .setRequired(false)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('channel')
            .setDescription('Affiche les informations d\'un canal')
            .addChannelOption(option => option.setName('canal')
                .setDescription('Le canal dont vous voulez voir les informations')
                .setRequired(false)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('role')
            .setDescription('Affiche les informations d\'un rôle')
            .addRoleOption(option => option.setName('role')
                .setDescription('Le rôle dont vous voulez voir les informations')
                .setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('emoji')
            .setDescription('Affiche les informations d\'un emoji')
            .addStringOption(option => option.setName('emoji')
                .setDescription('L\'emoji dont vous voulez voir les informations')
                .setRequired(true)));

export async function execute(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'server':
            await executeServerInfo(interaction);
            break;
        case 'user':
            await executeUserInfo(interaction);
            break;
        case 'channel':
            await executeChannelInfo(interaction);
            break;
        case 'role':
            await executeRoleInfo(interaction);
            break;
        case 'emoji':
            await executeEmojiInfo(interaction);
            break;
    }
}

async function executeServerInfo(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply(KEPLER_MESSAGES.guildOnly);
        return;
    }

    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    const memberCount = guild.memberCount;
    const channelCount = guild.channels.cache.size;
    const roleCount = guild.roles.cache.size;
    const emojiCount = guild.emojis.cache.size;
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username || 'Bot',
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.primary)
        .setTitle(`Informations sur ${guild.name}`)
        .setThumbnail(guild.iconURL({ forceStatic: false }))
        .addFields(
            { name: '👑 Propriétaire', value: owner.user.username, inline: true },
            { name: '🆔 ID du serveur', value: guild.id, inline: true },
            { name: '📅 Créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '👥 Membres', value: memberCount.toString(), inline: true },
            { name: '📺 Canaux', value: channelCount.toString(), inline: true },
            { name: '🎭 Rôles', value: roleCount.toString(), inline: true },
            { name: '😀 Emojis', value: emojiCount.toString(), inline: true },
            { name: '🚀 Niveau de boost', value: `Niveau ${boostLevel}`, inline: true },
            { name: '💎 Boosts', value: boostCount.toString(), inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function executeUserInfo(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username || 'Bot',
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.primary)
        .setTitle(`Informations sur ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ forceStatic: false }))
        .addFields(
            { name: '👤 Nom d\'utilisateur', value: targetUser.username, inline: true },
            { name: '🆔 ID', value: targetUser.id, inline: true },
            { name: '📅 Compte créé le', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '🎭 Surnom', value: member?.nickname || 'Aucun surnom', inline: true },
            { name: '🎨 Couleur', value: member?.displayHexColor || 'Couleur par défaut', inline: true },
            { name: '📊 Rôles', value: member?.roles.cache.size.toString() || '0', inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function executeChannelInfo(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const targetChannel = interaction.options.getChannel('canal') || interaction.channel;

    if (!targetChannel) {
        await interaction.reply('Impossible de trouver le canal spécifié.');
        return;
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username || 'Bot',
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.primary)
        .setTitle(`Informations sur ${targetChannel.name}`)
        .addFields(
            { name: '📺 Nom', value: targetChannel.name, inline: true },
            { name: '🆔 ID', value: targetChannel.id, inline: true },
            { name: '📅 Créé le', value: `<t:${Math.floor(targetChannel.createdTimestamp / 1000)}:F>`},
            { name: '📝 Type', value: getChannelTypeName(targetChannel.type)},
            { name: '📍 Position', value: targetChannel.position?.toString() || 'N/A', inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function executeRoleInfo(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const targetRole = interaction.options.getRole('role');

    if (!targetRole) {
        await interaction.reply({ content: 'Veuillez spécifier un rôle.', ephemeral: true });
        return;
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username || 'Bot',
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(targetRole.color || KEPLER_COLORS.primary)
        .setTitle(`Informations sur ${targetRole.name}`)
        .addFields(
            { name: '🎭 Nom', value: targetRole.name, inline: true },
            { name: '🆔 ID', value: targetRole.id, inline: true },
            { name: '📅 Créé le', value: `<t:${Math.floor(targetRole.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '📍 Position', value: targetRole.position.toString(), inline: true },
            { name: '👥 Membres', value: targetRole.members?.size?.toString() || 'N/A', inline: true },
            { name: '🎨 Couleur', value: targetRole.hexColor, inline: true },
            { name: '🔒 Mentionnable', value: targetRole.mentionable ? 'Oui' : 'Non', inline: true },
            { name: '👁️ Affiché séparément', value: targetRole.hoist ? 'Oui' : 'Non', inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function executeEmojiInfo(interaction: CommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const emojiInput = interaction.options.getString('emoji', true);

    // Regex pour extraire l'ID d'un emoji custom Discord (<:name:id> ou <a:name:id>)
    const customEmojiRegex = /<a?:(\w+):(\d+)>/;
    const match = emojiInput.match(customEmojiRegex);

    if (!match) {
        await interaction.reply({
            content: 'Veuillez fournir un emoji personnalisé du serveur (ex: <:nom:123456789>).',
            ephemeral: true
        });
        return;
    }

    const emojiName = match[1];
    const emojiId = match[2];
    const isAnimated = emojiInput.startsWith('<a:');

    // Chercher l'emoji dans le cache du serveur
    const emoji = interaction.guild?.emojis.cache.get(emojiId);

    if (!emoji) {
        // L'emoji n'est pas sur ce serveur, on affiche les infos disponibles
        const embed = createKeplerEmbed()
            .setAuthor({
                name: interaction.client.user?.username || 'Bot',
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
            })
            .setColor(KEPLER_COLORS.primary)
            .setTitle(`Informations sur :${emojiName}:`)
            .setThumbnail(`https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`)
            .addFields(
                { name: '😀 Nom', value: emojiName, inline: true },
                { name: '🆔 ID', value: emojiId, inline: true },
                { name: '🎬 Animé', value: isAnimated ? 'Oui' : 'Non', inline: true },
                { name: '🔗 URL', value: `[Lien](https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'})`, inline: true },
                { name: '📍 Serveur', value: 'Emoji externe', inline: true }
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // Emoji trouvé sur le serveur
    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username || 'Bot',
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.primary)
        .setTitle(`Informations sur :${emoji.name}:`)
        .setThumbnail(emoji.url)
        .addFields(
            { name: '😀 Nom', value: emoji.name || 'Inconnu', inline: true },
            { name: '🆔 ID', value: emoji.id, inline: true },
            { name: '📅 Créé le', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '🎬 Animé', value: emoji.animated ? 'Oui' : 'Non', inline: true },
            { name: '🔗 URL', value: `[Lien](${emoji.url})`, inline: true },
            { name: '📍 Serveur', value: interaction.guild?.name || 'Inconnu', inline: true },
            { name: '👤 Créateur', value: emoji.author?.username || 'Inconnu', inline: true },
            { name: '🔒 Disponible', value: emoji.available ? 'Oui' : 'Non', inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

function getChannelTypeName(type: ChannelType): string {
    switch (type) {
        case ChannelType.GuildText: return 'Canal texte';
        case ChannelType.GuildVoice: return 'Canal vocal';
        case ChannelType.GuildCategory: return 'Catégorie';
        case ChannelType.GuildNews: return 'Canal d\'annonces';
        case ChannelType.GuildNewsThread: return 'Fil d\'annonces';
        case ChannelType.GuildPublicThread: return 'Fil public';
        case ChannelType.GuildPrivateThread: return 'Fil privé';
        case ChannelType.GuildStageVoice: return 'Canal de scène';
        case ChannelType.GuildDirectory: return 'Répertoire';
        case ChannelType.GuildForum: return 'Forum';
        default: return 'Inconnu';
    }
}
