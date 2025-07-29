import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Affiche les statistiques du bot');

export async function execute(interaction: CommandInteraction) {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
        .setTitle('📊 Statistiques du Bot')
        .addFields(
            { name: '🏓 Latence', value: `${interaction.client.ws.ping}ms`, inline: true },
            { name: '⏰ Temps de fonctionnement', value: `${days}j ${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: '🏠 Serveurs', value: interaction.client.guilds.cache.size.toString(), inline: true },
            { name: '👥 Utilisateurs', value: interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toString(), inline: true },
            { name: '📺 Canaux', value: interaction.client.channels.cache.size.toString(), inline: true },
            { name: '🎭 Rôles', value: interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.roles.cache.size, 0).toString(), inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 