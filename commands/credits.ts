import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';


export const data = new SlashCommandBuilder()
    .setName('credits')
    .setDescription('Crédits et remerciments.');
export async function execute(interaction: CommandInteraction) {

    const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.client.user?.username, iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) })
        .setColor('#FFD700')
        .setTitle('Crédits')
        .setImage('https://imgur.com/1CsxfGp.png')
        .addFields(
            { name: 'Image :', value: '[Freepik](https://www.flaticon.com/authors/freepik)', inline: true },
            { name : 'Développeur :', value: '[Antow](https://github.com/Antoww/)', inline: true },
            { name : 'Aide :', value: 'Merci à [Ayfri](https://ayfri.com/) pour sa patience et son aide ! <3', inline: true }
        )
        .addFields(
            { name: 'Langage :', value: 'TypeScript', inline: true },
            { name: 'Bibliothèque :', value: 'Discord.js', inline: true },
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}