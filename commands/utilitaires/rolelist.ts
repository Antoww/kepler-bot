import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('rolelist')
    .setDescription('Affiche la liste des rôles du serveur');

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const roles = interaction.guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .map(role => `${role} - ${role.members.size} membres`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
        .setTitle(`Rôles de ${interaction.guild.name}`)
        .setDescription(roles.length > 4096 ? roles.substring(0, 4093) + '...' : roles)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 