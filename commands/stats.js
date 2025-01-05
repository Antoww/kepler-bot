const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);
const startTime = new Date();

function getUptime() {
    const now = dayjs();
    const uptimeDuration = dayjs.duration(now.diff(dayjs(startTime)));

    const uptimeFormatted = `${uptimeDuration.days()}j ${uptimeDuration.hours()}h ${uptimeDuration.minutes()}m ${uptimeDuration.seconds()}s`;
    return uptimeFormatted;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Donne les stats générales du bot.'),
    async execute(interaction) {
        const ram = process.memoryUsage().heapUsed / 1024 / 1024;
        const uptimeFormatted = getUptime();

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Stats')
            .addFields(
                { name: 'Mémoire utilisée :', value: `${ram.toFixed(2)} MB`, inline: true },
                { name: 'Uptime :', value: `${uptimeFormatted}`, inline: true },
                { name: 'Serveurs :', value: `${interaction.client.guilds.cache.size}`, inline: true },
                { name: 'Utilisateurs :', value: `${interaction.client.users.cache.size}`, inline: true },
                {name: 'Bots : ', value: `${interaction.client.users.cache.filter(user => user.bot).size}`, inline: true},
                {name: 'Salons : ', value: `${interaction.client.channels.cache.size}`, inline: true},
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        console.log("[LOG]", "Commande stats exécutée");
    },
};