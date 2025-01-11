const { SlashCommandBuilder, EmbedBuilder, GuildVerificationLevel, GuildDefaultMessageNotifications } = require('discord.js');
const dayjs = require('dayjs');
require('dayjs/locale/fr');
dayjs.locale('fr');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Donne les stats du serveur.'),

    async execute(interaction) {
        const owner = await interaction.guild.fetchOwner();
        const dateServeur = dayjs(interaction.guild.createdAt).format('DD/MM/YYYY à HH:mm:ss');

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Server Info')
            .addFields(
                { name: 'Nom du serveur :', value: `${interaction.guild.name} *${interaction.guild.id}*`, inline: true },
                { name: 'Nombre de membres :' , value: `${interaction.guild.memberCount}`, inline: true },
                { name: 'Nombre de bots : ', value: `${interaction.guild.members.cache.filter(member => member.user.bot).size}`, inline: true },
                { name: 'Nombre de salons :', value: `${interaction.guild.channels.cache.size}`, inline: true },
                { name: 'Nombre de rôles :', value: `${interaction.guild.roles.cache.size}`, inline: true },
                { name: 'Nombre d\'emojis :', value: `${interaction.guild.emojis.cache.size}`, inline: true },
                { name: 'Propriétaire :', value: `${owner.user.username} *${owner.user.id}*`, inline: true },
                { name: 'Créé le :', value: `${dateServeur}`, inline: true },
                { name: 'Niveau de vérification :', value: `${getVerificationLevelName(interaction.guild.verificationLevel)}`, inline: true },
                { name: 'Niveau de notification :', value: `${getDefaultMessageNotificationName(interaction.guild.defaultMessageNotifications)}`, inline: true },
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        console.log("[LOG]", "Commande SI exécutée");
    },
};

function getVerificationLevelName(level) {
    switch (level) {
        case GuildVerificationLevel.None:
            return 'Aucune';
        case GuildVerificationLevel.Low:
            return 'Faible';
        case GuildVerificationLevel.Medium:
            return 'Moyenne';
        case GuildVerificationLevel.High:
            return 'Haute';
        case GuildVerificationLevel.VeryHigh:
            return 'Maximale';
        default:
            return 'Inconnu';
    }
}

function getDefaultMessageNotificationName(level) {
    switch (level) {
        case GuildDefaultMessageNotifications.AllMessages:
            return 'Tous les messages';
        case GuildDefaultMessageNotifications.OnlyMentions:
            return 'Seulement les mentions';
        default:
            return 'Inconnu';
    }
}