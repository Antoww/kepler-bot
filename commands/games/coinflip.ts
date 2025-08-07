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
        .setColor(resultColor)
        .setTitle(`${resultEmoji} Résultat du lancé de pièce`)
        .setDescription(`**${resultText}** !`)
        .addFields(
            { name: '🎲 Tirage', value: 'La pièce a été lancée avec succès !', inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 