import { createKeplerEmbed, KEPLER_COLORS } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Donne la latence du bot et de l\'API Discord.');
export async function execute(interaction: CommandInteraction) {
    // Envoyer un message initial pour mesurer le temps de réponse réel
    const sent = await interaction.reply({ content: '🏓 Calcul du ping...', fetchReply: true });

    // Latence WebSocket (heartbeat Discord) - peut être -1 au démarrage
    const wsPing = interaction.client.ws.ping;
    const wsPingDisplay = wsPing >= 0 ? `${wsPing}ms` : 'Calcul...';

    // Latence aller-retour réelle (temps entre commande et réponse)
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;

    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.success)
        .setTitle('🏓 Pong !')
        .addFields(
            { name: '📡 WebSocket', value: wsPingDisplay, inline: true },
            { name: '⚡ Aller-retour', value: `${roundTrip}ms`, inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
}