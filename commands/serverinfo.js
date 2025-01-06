const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
/*const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);
const startTime = new Date();

function getUptime() {
    const now = dayjs();
    const uptimeDuration = dayjs.duration(now.diff(dayjs(startTime)));

    const uptimeFormatted = `${uptimeDuration.days()}j ${uptimeDuration.hours()}h ${uptimeDuration.minutes()}m ${uptimeDuration.seconds()}s`;
    return uptimeFormatted;
}*/

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Donne les stats du serveur.'),
    async execute(interaction) {
        const owner = await interaction.guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Server Info')
            .addFields(
                { name: 'Nom du serveur :', value: `${interaction.guild.name} *${interaction.guild.id}*`, inline: true },
                { name: 'Nombre de membres :' , value: `${interaction.guild.memberCount}`, inline: true },
                {name: 'Nombre de bots : ', value: `${interaction.guild.members.cache.filter(member => member.user.bot).size}`, inline: true},
                { name: 'Nombre de salons :', value: `${interaction.guild.channels.cache.size}`, inline: true },
                { name: 'Nombre de rôles :', value: `${interaction.guild.roles.cache.size}`, inline: true },
                { name: 'Nombre d\'emojis :', value: `${interaction.guild.emojis.cache.size}`, inline: true },
                { name: 'Propriétaire :', value: `${owner.user.username} *${owner.user.id}*`, inline: true },
                { name: 'Créé le :', value: `${interaction.guild.createdAt}`, inline: true },
                { name: 'Région :', value: `${interaction.guild.region}`, inline: true },
                { name: 'Niveau de vérification :', value: `${interaction.guild.verificationLevel}`, inline: true },
                { name: 'Niveau de notification :', value: `${interaction.guild.defaultMessageNotifications}`, inline: true },
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        console.log("[LOG]", "Commande SI exécutée");
    },
};