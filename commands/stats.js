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
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: '<:cpu:736643846812729446> Mémoire utilisée :', value: `${ram.toFixed(2)} MB`, inline: true },
                { name: '⏲ Uptime :', value: `${uptimeFormatted}`, inline: true },
                { name: '<:idle:635159039852019722> Serveurs :', value: `${interaction.client.guilds.cache.size}`, inline: true },
                { name: '<:hey:635159039831048202> Utilisateurs :', value: `${interaction.client.users.cache.size}`, inline: true },
                {name: '<:bot:638858747351007233> Bots : ', value: `${interaction.client.users.cache.filter(user => user.bot).size}`, inline: true},
                {name: '<:textuel:635159053630308391> Salons : ', value: `${interaction.client.channels.cache.size}`, inline: true},
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        console.log('[LOG]',`Commande ${__filename} executée par ${interaction.user.tag} (${interaction.user.id})`);
    },
};