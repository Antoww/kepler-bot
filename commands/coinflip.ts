import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Lance une pièce et affiche le résultat (Pile ou Face).');

export async function execute(interaction: CommandInteraction) {
    // Générer un résultat aléatoire (true = Pile, false = Face)
    const result = Math.random() < 0.5;
    const resultText = result ? 'Pile' : 'Face';
    const resultEmoji = result ? '🪙' : '💿';
    const resultColor = result ? '#FFD700' : '#C0C0C0'; // Or pour Pile, Argent pour Face

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor(resultColor)
        .setTitle(`${resultEmoji} Résultat du tirage au sort`)
        .setDescription(`**${resultText}** !`)
        .addFields(
            { name: '🎲 Tirage', value: 'La pièce a été lancée avec succès !', inline: true },
            { name: '📊 Probabilité', value: '50% de chance pour chaque côté', inline: true }
        )
        .setFooter({
            text: `Demandé par ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
