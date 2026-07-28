import { createKeplerEmbed, KEPLER_COLORS } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';
import config from '../../config.json' with { type: 'json' };

export const data = new SlashCommandBuilder()
    .setName('credits')
    .setDescription('Affiche les crédits du bot');

export async function execute(interaction: CommandInteraction) {

    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.primary)
        .setTitle('👨‍💻 Crédits du Bot')
        .setDescription('Quelques informations relatives au bot Kepler.')
        .addFields(
            { name: '🛠️ Développeur', value: '[Antow](https://github.com/Antoww)'},
            { name: '📅 Version', value: `${config.botversion}`, inline: true},
            { name: '🔧 Technologie', value: '[Discord.js](https://discord.js.org/) & [Deno](https://deno.com/)', inline: true },
            { name: '🌐 Hébergement', value: '[Hetzner](https://hetzner.com/)', inline: true },
            { name: 'Icones', value: 'Les icônes utilisées dans le bot proviennent de [FlatIcon](https://www.flaticon.com/)' },
            { name: '💖 Remerciements', value: 'Merci à [Ayfri](https://github.com/Ayfri) & à tous les contributeurs et utilisateurs qui rendent ce projet possible !' }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}