const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upload')
        .setDescription('Upload une image vers Imgur')
        .addAttachmentOption(option => 
            option.setName('image')
                .setDescription('L\'image à uploader')
                .setRequired(true)),
    async execute(interaction) {
        const attachment = interaction.options.getAttachment('image');
        const imageUrl = attachment.url;

        try {
            const response = await axios.post('https://api.imgur.com/3/upload', {
                image: imageUrl,
                type: 'url'
            }, {
                headers: {
                    Authorization: `${process.env.IMGUR_CLIENT_ID}`
                }
            });

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Image uploadée avec succès !')
                .setDescription(`[Voir l'image sur Imgur](${response.data.data.link})`)
                .setImage(response.data.data.link)
                .setFooter({
                    text: 'Demandé par ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply('Une erreur est survenue lors de l\'upload de l\'image.');
        }
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${__filename} executée par ${interaction.user.tag} (${interaction.user.id})`);
    },
};