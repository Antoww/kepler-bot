const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, '../database/confserver.json');

let config = {
    logChannel: null
};

// Charger la configuration depuis un fichier
if (fs.existsSync(configFilePath)) {
    config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Configure le bot.')
        .addStringOption(option => 
            option.setName('paramètre')
                .setDescription('Le paramètre à configurer')
                .setRequired(true)
                .addChoices(
                    { name: 'Salon de log', value: 'logChannel' }
                ))
        .addStringOption(option => 
            option.setName('valeur')
                .setDescription('La valeur du paramètre')
                .setRequired(true)),
    async execute(interaction) {
        const param = interaction.options.getString('paramètre');
        const value = interaction.options.getString('valeur');

        if (param === 'logChannel') {
            config.logChannel = value;
            fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
            await interaction.reply(`Le salon de log a été configuré sur ${value}.`);
        } else {
            await interaction.reply('Paramètre inconnu.', { ephemeral: true });
        }
    },
};