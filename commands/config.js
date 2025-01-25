const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const file = 'config.js';

const configFilePath = path.join(__dirname, '../database/confserver.json');

let config = {};

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
                    { name: 'Salon de log', value: 'logChannel' },
                    { name: 'Salon d\'anniversaire', value: 'birthdayChannel' }
                ))
        .addStringOption(option => 
            option.setName('valeur')
                .setDescription('La valeur du paramètre')
                .setRequired(true)),
    async execute(interaction) {
        const param = interaction.options.getString('paramètre');
        const value = interaction.options.getString('valeur');
        const guildId = interaction.guild.id;

        if (!config[guildId]) {
            config[guildId] = {};
        }

        if (param === 'logChannel' || param === 'birthdayChannel') {
            config[guildId][param] = value;
            fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
            await interaction.reply(`Le paramètre ${param} a été configuré sur ${value} pour cette guilde.`);
        } else {
            await interaction.reply('Paramètre inconnu.', { ephemeral: true });
        }
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${file} executée par ${interaction.user.tag} (${interaction.user.id})`);
    },
};