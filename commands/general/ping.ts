import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Donne la latence du bot et de l\'API Discord.');
export async function execute(interaction: CommandInteraction) {
    const botPing = interaction.client.ws.ping;
    const apiPing = Date.now() - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
        .setTitle('Pong ! 🏓')
        .setDescription(`Latence du bot : ${botPing}ms\nLatence de l'API : ${apiPing}ms`)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 