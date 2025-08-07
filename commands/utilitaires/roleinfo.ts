import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Affiche les informations d\'un rôle')
    .addRoleOption(option => option.setName('role')
        .setDescription('Le rôle dont vous voulez voir les informations')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    const targetRole = interaction.options.getRole('role');

    if (!targetRole) {
        await interaction.reply('Veuillez spécifier un rôle.', { ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor(targetRole.color || '#0099ff')
        .setTitle(`Informations sur ${targetRole.name}`)
        .addFields(
            { name: '🎭 Nom', value: targetRole.name, inline: true },
            { name: '🆔 ID', value: targetRole.id, inline: true },
            { name: '📅 Créé le', value: `<t:${Math.floor(targetRole.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '📍 Position', value: targetRole.position.toString(), inline: true },
            { name: '👥 Membres', value: targetRole.members.size.toString(), inline: true },
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