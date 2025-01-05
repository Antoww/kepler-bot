const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('Donne les crédits du bot.'),
    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Crédits')
            .setImage('https://imgur.com/1CsxfGp.png')
            .setDescription(`Icône du bot : [Freepik](https://www.flaticon.com/authors/freepik)\nBot développé par Antow.`);

        await interaction.reply({ embeds: [embed] });
        console.log("[LOG]", "Commande credits exécutée")
    },
};