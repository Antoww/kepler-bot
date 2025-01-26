import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Birthdays, Configs } from "../types.d.ts";

const bdayFilePath = path.join(Deno.cwd(), './database/bday.json');
const configFilePath = path.join(Deno.cwd(), './database/confserver.json');

let config: Configs = {};

// Charger la configuration depuis un fichier
if (existsSync(configFilePath)) {
    config = JSON.parse(readFileSync(configFilePath, 'utf8'));
}

export const data = new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Enregistre votre anniversaire pour vous le souhaiter.')
    .addStringOption(option => option.setName('date')
        .setDescription('Entrez votre anniversaire au format JJ/MM ou JJ/MM/AAAA')
        .setRequired(true));
export async function execute(interaction: CommandInteraction) {

    if (!interaction.guild) {
        await interaction.reply('Erreur : Vous devez être sur un serveur Discord.');
        return;
    }

    const date = interaction.options.get('date')?.value as string ?? "";
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Validate date format
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])(\/\d{4})?$/;
    if (!dateRegex.test(date)) {
        return interaction.reply({ content: 'Format de date invalide. Veuillez utiliser les formats JJ/MM ou JJ/MM/AAAA.', ephemeral: true });
    }

    // Load existing birthdays
    let bdays: Birthdays = {};
    if (existsSync(bdayFilePath)) {
        const fileContent = readFileSync(bdayFilePath, 'utf8');
        if (fileContent) {
            bdays = JSON.parse(fileContent);
        }
    }

    // Save the birthday
  
    bdays[guildId] ??= {};

    bdays[guildId][userId] = date;
    writeFileSync(bdayFilePath, JSON.stringify(bdays, null, 2));

    await interaction.reply({ content: 'Votre anniversaire a été enregistré avec succès !', ephemeral: true });

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
                    iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                })
                .setTimestamp();
            
            if (!birthdayChannel.isTextBased()) return;
            birthdayChannel.send({ embeds: [embed] });
        }
    }
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Anniversaire de ${interaction.user.tag} (${interaction.user.id}) enregistré pour le ${date}`);
}