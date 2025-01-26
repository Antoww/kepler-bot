import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Configs } from "../types.d.ts";

const configFilePath = path.join(Deno.cwd(), './database/confserver.json');

let config: Configs = {};

// Charger la configuration depuis un fichier
if (existsSync(configFilePath)) {
    config = JSON.parse(readFileSync(configFilePath, 'utf8'));
}

const choices = [
    { name: 'Salon de log', value: 'logChannel' },
    { name: 'Salon d\'anniversaire', value: 'birthdayChannel' }
] as const;

type ChoiceValue = typeof choices[number]['value'];

export const data = new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configurer le bot selon vos besoins.')
    .addStringOption(option => option.setName('paramètre')
        .setDescription('Le paramètre à configurer')
        .setRequired(true)
        .addChoices(...choices)
    )
    .addStringOption(option => option.setName('valeur')
        .setDescription('La valeur du paramètre')
        .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        interaction.reply('Erreur : Vous devez être sur un serveur Discord.')
        return;
    }

    const param = interaction.options.get('paramètre')?.value as ChoiceValue ?? "";
    const value = interaction.options.get('valeur')?.value as string ?? "";
    const guildId = interaction.guild.id;

    config[guildId] ??= {};

    config[guildId][param] = value;
    writeFileSync(configFilePath, JSON.stringify(config, null, 2));
    await interaction.reply(`Le paramètre ${param} a été configuré sur ${value} pour cette guilde.`);
}