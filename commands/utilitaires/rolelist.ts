import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('rolelist')
    .setDescription('Affiche la liste des rôles du serveur');

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply(KEPLER_MESSAGES.guildOnly);
        return;
    }

    const roles = interaction.guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .map(role => `${role} - ${role.members.size} membres`)
        .join('\n');

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username,
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.primary)
        .setTitle(`Rôles de ${interaction.guild.name}`)
        .setDescription(roles.length > 4096 ? roles.substring(0, 4093) + '...' : roles)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}