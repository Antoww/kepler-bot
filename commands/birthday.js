const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const file = 'birthday.js';

const bdayFilePath = path.join(__dirname, '../database/bday.json');
const configFilePath = path.join(__dirname, '../database/confserver.json');

let config = {};

// Charger la configuration depuis un fichier
if (fs.existsSync(configFilePath)) {
    config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Enregistre votre anniversaire.')
        .addStringOption(option => 
            option.setName('date')
                .setDescription('Entrez votre anniversaire au format JJ/MM ou JJ/MM/AAAA')
                .setRequired(true)),
    async execute(interaction) {
        const date = interaction.options.getString('date');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

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
        if (!bdays[guildId]) {
            bdays[guildId] = {};
        }
        bdays[guildId][userId] = date;
        fs.writeFileSync(bdayFilePath, JSON.stringify(bdays, null, 2));

        await interaction.reply({ content: 'Votre anniversaire a été enregistré avec succès!', ephemeral: true });

        // Set a timeout to send the reminder
        const birthdayChannelId = config[guildId] && config[guildId].birthdayChannel;
        if (birthdayChannelId) {
            const birthdayChannel = interaction.guild.channels.cache.get(birthdayChannelId);
            if (birthdayChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Joyeux Anniversaire!')
                    .setDescription(`Joyeux anniversaire <@${userId}>! 🎉🎂`)
                    .setFooter({
                        text: `Anniversaire de ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();

                birthdayChannel.send({ embeds: [embed] });
            }
        }
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Anniversaire de ${interaction.user.tag} (${interaction.user.id}) enregistré pour le ${date}`);
    },
};