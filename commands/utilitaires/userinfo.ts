import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, User } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Affiche les informations d\'un utilisateur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur dont vous voulez voir les informations')
        .setRequired(false));

export async function execute(interaction: CommandInteraction) {
    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
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