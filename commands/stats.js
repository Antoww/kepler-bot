import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import dayjs from 'dayjs';
import pluginDuration from 'https://cdn.skypack.dev/dayjs@1.11.13/plugin/duration';
import process from "node:process";
dayjs.extend(pluginDuration);
const startTime = new Date();
const file = 'stats.js';

function getUptime() {
    const now = dayjs();
    const uptimeDuration = dayjs.duration(now.diff(dayjs(startTime)));

    const uptimeFormatted = `${uptimeDuration.days()}j ${uptimeDuration.hours()}h ${uptimeDuration.minutes()}m ${uptimeDuration.seconds()}s`;
    return uptimeFormatted;
}

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Donne les statistiques générales du bot.');
export async function execute(interaction) {
    const ram = process.memoryUsage().heapUsed / 1024 / 1024;
    const uptimeFormatted = getUptime();

    // Calculer les statistiques globales
    let totalUsers = 0;
    let totalBots = 0;
    let totalChannels = 0;

    interaction.client.guilds.cache.forEach(guild => {
        totalUsers += guild.memberCount;
        totalBots += guild.members.cache.filter(member => member.user.bot).size;
        totalChannels += guild.channels.cache.size;
    });

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Stats')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .addFields(
            { name: '<:cpu:736643846812729446> Mémoire utilisée :', value: `${ram.toFixed(2)} MB`, inline: true },
            { name: '⏲ Uptime :', value: `${uptimeFormatted}`, inline: true },
            { name: '<:idle:635159039852019722> Serveurs :', value: `${interaction.client.guilds.cache.size}`, inline: true },
            { name: '<:hey:635159039831048202> Utilisateurs :', value: `${totalUsers}`, inline: true },
            { name: '<:bot:638858747351007233> Bots : ', value: `${totalBots}`, inline: true },
            { name: '<:textuel:635159053630308391> Salons : ', value: `${totalChannels}`, inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${file} executée par ${interaction.user.tag} (${interaction.user.id})`);
}