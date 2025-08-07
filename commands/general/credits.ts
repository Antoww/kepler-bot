import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.json' with { type: 'json' };

export const data = new SlashCommandBuilder()
    .setName('credits')
    .setDescription('Affiche les crédits du bot');

export async function execute(interaction: CommandInteraction) {

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('👨‍💻 Crédits du Bot')
        .setDescription('Quelques informations relatives au bot Kepler.')
        .addFields(
            { name: '🛠️ Développeur', value: '[Antow](https://github.com/Antoww)'},
            { name: '📅 Version', value: `${config.botversion}`},
            { name: '🔧 Technologie', value: '[Discord.js](https://discord.js.org/) & [Deno](https://deno.com/)', inline: true },
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 