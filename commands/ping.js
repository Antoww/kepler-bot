const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Donne la latence du bot et de l\'API Discord.'),
    async execute(interaction) {
        const botPing = interaction.client.ws.ping;
        const apiPing = Date.now() - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Pong ! 🏓')
            .setDescription(`Latence du bot : ${botPing}ms\nLatence de l'API : ${apiPing}ms`)
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL : interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        console.log("[LOG]", "Commande ping exécutée")
    },
};