import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { createKeplerEmbed, setRequesterFooter } from '../../utils/theme.ts';

export const data = new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Lance un ou plusieurs dés')
    .addIntegerOption(option => option
        .setName('nombre')
        .setDescription('Nombre de dés à lancer (défaut : 1)')
        .setMinValue(1)
        .setMaxValue(20))
    .addIntegerOption(option => option
        .setName('faces')
        .setDescription('Nombre de faces par dé (défaut : 6)')
        .addChoices(
            { name: 'd4', value: 4 }, { name: 'd6', value: 6 }, { name: 'd8', value: 8 },
            { name: 'd10', value: 10 }, { name: 'd12', value: 12 }, { name: 'd20', value: 20 },
            { name: 'd100', value: 100 }
        ));

export async function execute(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger('nombre') ?? 1;
    const faces = interaction.options.getInteger('faces') ?? 6;
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * faces) + 1);
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    const highest = Math.max(...rolls);
    const lowest = Math.min(...rolls);
    const tone = rolls.every(roll => roll === faces) ? 'success' : rolls.every(roll => roll === 1) ? 'danger' : 'accent';

    const embed = setRequesterFooter(
        createKeplerEmbed(tone)
            .setTitle(`🎲 Lancer de ${count}d${faces}`)
            .setDescription(rolls.map(roll => `\`${roll}\``).join(' + '))
            .addFields(
                { name: 'Total', value: `**${total}**`, inline: true },
                { name: 'Minimum', value: String(lowest), inline: true },
                { name: 'Maximum', value: String(highest), inline: true }
            ),
        interaction.user
    );
    await interaction.reply({ embeds: [embed] });
}
