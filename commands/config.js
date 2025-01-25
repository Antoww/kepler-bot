import { SlashCommandBuilder } from 'discord.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const file = 'config.js';

const configFilePath = join(import.meta.dirname, '../database/confserver.json');

let config = {};

// Charger la configuration depuis un fichier
if (existsSync(configFilePath)) {
    config = JSON.parse(readFileSync(configFilePath, 'utf8'));
}

export const data = new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure le bot.')
    .addStringOption(option => option.setName('paramètre')
        .setDescription('Le paramètre à configurer')
        .setRequired(true)
        .addChoices(
            { name: 'Salon de log', value: 'logChannel' },
            { name: 'Salon d\'anniversaire', value: 'birthdayChannel' }
        ))
    .addStringOption(option => option.setName('valeur')
        .setDescription('La valeur du paramètre')
        .setRequired(true));
export async function execute(interaction) {
    const param = interaction.options.getString('paramètre');
    const value = interaction.options.getString('valeur');
    const guildId = interaction.guild.id;

    if (!config[guildId]) {
        config[guildId] = {};
    }

    if (param === 'logChannel' || param === 'birthdayChannel') {
        config[guildId][param] = value;
        writeFileSync(configFilePath, JSON.stringify(config, null, 2));
        await interaction.reply(`Le paramètre ${param} a été configuré sur ${value} pour cette guilde.`);
    } else {
        await interaction.reply('Paramètre inconnu.', { ephemeral: true });
    }
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${file} executée par ${interaction.user.tag} (${interaction.user.id})`);
}