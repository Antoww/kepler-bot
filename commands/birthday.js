const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bdayFilePath = path.join(__dirname, '../database/bday.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Enregistre votre anniversaire pour vous le souhaiter !')
        .addStringOption(option => 
            option.setName('date')
                .setDescription('Entrez votre anniversaire au format JJ/MM ou JJ/MM/AAAA')
                .setRequired(true)),
    async execute(interaction) {
        const date = interaction.options.getString('date');
        const userId = interaction.user.id;

        // Validate date format
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])(\/\d{4})?$/;
        if (!dateRegex.test(date)) {
            return interaction.reply({ content: 'Format de date invalide. Utilisez JJ/MM ou JJ/MM/AAAA.', ephemeral: true });
        }

        // Load existing birthdays
        let bdays = {};
        if (fs.existsSync(bdayFilePath)) {
            const fileContent = fs.readFileSync(bdayFilePath, 'utf8');
            if (fileContent) {
                bdays = JSON.parse(fileContent);
            }
        }

        // Save the birthday
        bdays[userId] = date;
        fs.writeFileSync(bdayFilePath, JSON.stringify(bdays, null, 2));

        await interaction.reply({ content: 'Votre anniversaire a été enregistré avec succès!', ephemeral: true });
        console.log('[LOG]',`Commande ${__filename} executée par ${interaction.user.tag} (${interaction.user.id})`);
    },
};