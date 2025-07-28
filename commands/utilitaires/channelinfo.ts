import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, ChannelType } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Affiche les informations d\'un canal')
    .addChannelOption(option => option.setName('canal')
        .setDescription('Le canal dont vous voulez voir les informations')
        .setRequired(false));

export async function execute(interaction: CommandInteraction) {
    const targetChannel = interaction.options.getChannel('canal') || interaction.channel;

    if (!targetChannel) {
        await interaction.reply('Impossible de trouver le canal spécifié.');
        return;
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
        .setTitle(`Informations sur ${targetChannel.name}`)
        .addFields(
            { name: '📺 Nom', value: targetChannel.name, inline: true },
            { name: '🆔 ID', value: targetChannel.id, inline: true },
            { name: '📅 Créé le', value: `<t:${Math.floor(targetChannel.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '📝 Type', value: getChannelTypeName(targetChannel.type), inline: true },
            { name: '📍 Position', value: targetChannel.position.toString(), inline: true }
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