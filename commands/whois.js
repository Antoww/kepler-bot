const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const whois = require('whois-json');
const file = 'whois.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whois')
        .setDescription('Donne des informations sur un site web.')
        .addStringOption(option => 
            option.setName('site')
                .setDescription('Entrez le nom de domaine du site web')
                .setRequired(true)),
    async execute(interaction) {
        const site = interaction.options.getString('site');

        await interaction.deferReply();

        try {
            const whoisData = await whois(site);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`WHOIS Info de : ${site}`)
                .addFields(
                    { name: 'Nom de domaine', value: whoisData.domainName || 'N/A', inline: true },
                    { name: 'Registrar', value: whoisData.registrar || 'N/A', inline: true },
                    { name: 'Creation Date', value: whoisData.creationDate || 'N/A', inline: true },
                    { name: 'Expiration Date', value: whoisData.expirationDate || 'N/A', inline: true },
                    { name: 'Updated Date', value: whoisData.updatedDate || 'N/A', inline: true },
                    { name: 'Status', value: whoisData.status || 'N/A', inline: true },
                    { name: 'Name Servers', value: whoisData.nameServers ? whoisData.nameServers.join(', ') : 'N/A', inline: true },
                    { name: 'WHOIS Server Registrar', value: whoisData.whoisServerRegistrar || 'N/A', inline: true }
                )
                .setFooter({
                    text: 'Demandé par ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Erreur lors de la récupération des informations WHOIS.', ephemeral: true });
        }
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${file} executée par ${interaction.user.tag} (${interaction.user.id})`);
    },
};