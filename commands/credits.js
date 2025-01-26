import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
const file = 'credits.js';

export const data = new SlashCommandBuilder()
    .setName('credits')
    .setDescription('Donne les crédits du bot.');
export async function execute(interaction) {

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Crédits')
        .setImage('https://imgur.com/1CsxfGp.png')
        .setDescription(`Icône du bot : [Freepik](https://www.flaticon.com/authors/freepik)\nBot développé par [Antow](https://github.com/Antoww/).\nMerci à [Ayfri](https://ayfri.com/) pour sa patience et son aide. <3`)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${file} executée par ${interaction.user.tag} (${interaction.user.id})`);
}