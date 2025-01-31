import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';


export const data = new SlashCommandBuilder()
    .setName('credits')
    .setDescription('Crédits et remerciments.');
export async function execute(interaction: CommandInteraction) {

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Crédits')
        .setImage('https://imgur.com/1CsxfGp.png')
        .setDescription(`Icône du bot : [Freepik](https://www.flaticon.com/authors/freepik)\nBot développé par [Antow](https://github.com/Antoww/).\nMerci à [Ayfri](https://ayfri.com/) pour sa patience et son aide. <3`)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}