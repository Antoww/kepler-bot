import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Affiche les informations du serveur');

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
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

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
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