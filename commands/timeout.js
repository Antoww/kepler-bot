import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const configFilePath = join(import.meta.dirname, '../database/confserver.json');
const sanctionsFilePath = join(import.meta.dirname, '../database/sanctions.json');

let config = {};

// Charger la configuration depuis un fichier
if (existsSync(configFilePath)) {
    config = JSON.parse(readFileSync(configFilePath, 'utf8'));
}

export const data = new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Permet de timeout un utilisateur.')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur à mettre en timeout')
        .setRequired(true))
    .addIntegerOption(option => option.setName('durée')
        .setDescription('La durée du timeout')
        .setRequired(true))
    .addStringOption(option => option.setName('unité')
        .setDescription('L\'unité de temps (secondes, minutes, heures)')
        .setRequired(true)
        .addChoices(
            { name: 'Secondes', value: 'secondes' },
            { name: 'Minutes', value: 'minutes' },
            { name: 'Heures', value: 'heures' }
        ))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison du timeout')
        .setRequired(false));
export async function execute(interaction) {
    // Vérifier les permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: 'Vous n\'avez pas la permission d\'utiliser cette commande.', ephemeral: true });
    }

    const user = interaction.options.getUser('utilisateur');
    const duration = interaction.options.getInteger('durée');
    const unit = interaction.options.getString('unité');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    const member = interaction.guild.members.cache.get(user.id);
    if (!member) {
        return interaction.reply({ content: 'Utilisateur non trouvé.', ephemeral: true });
    }

    // Convert duration to milliseconds
    let durationMs;
    switch (unit) {
        case 'secondes':
            durationMs = duration * 1000;
            break;
        case 'minutes':
            durationMs = duration * 60 * 1000;
            break;
        case 'heures':
            durationMs = duration * 60 * 60 * 1000;
            break;
        default:
            return interaction.reply({ content: 'Unité de temps invalide.', ephemeral: true });
    }

    try {
        await member.timeout(durationMs, reason);

        // Charger les sanctions existantes
        let sanctions = {};
        if (existsSync(sanctionsFilePath)) {
            const fileContent = readFileSync(sanctionsFilePath, 'utf8');
            if (fileContent) {
                sanctions = JSON.parse(fileContent);
            }
        }

        // Initialiser les sanctions pour le serveur si nécessaire
        if (!sanctions[interaction.guild.id]) {
            sanctions[interaction.guild.id] = {
                count: 0,
                sanctions: []
            };
        }

        // Incrémenter le compteur de sanctions pour le serveur
        sanctions[interaction.guild.id].count += 1;

        const sanction = {
            sanctionId: sanctions[interaction.guild.id].count,
            userId: user.id,
            duration: duration,
            unit: unit,
            reason: reason,
            timestamp: new Date().toISOString(),
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            guildUrl: interaction.guild.iconURL({ dynamic: true })
        };

        // Ajouter la sanction à la liste des sanctions du serveur
        sanctions[interaction.guild.id].sanctions.push(sanction);

        // Sauvegarder les sanctions dans sanctions.json
        writeFileSync(sanctionsFilePath, JSON.stringify(sanctions, null, 2));

        await interaction.reply(`L'utilisateur ${member.user.tag} a été mis en timeout pour ${duration} ${unit}.`);

        // Poster la sanction dans le salon de log si configuré
        const guildConfig = config[interaction.guild.id];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Utilisateur en Timeout')
                    .addFields(
                        { name: 'Utilisateur', value: `${member.user.tag} (${member.user.id})`, inline: true },
                        { name: 'Durée', value: `${duration} ${unit}`, inline: true },
                        { name: 'Raison', value: reason, inline: true },
                        { name: 'Sanction ID', value: `${sanction.sanctionId}`, inline: true },
                        { name: 'Serveur', value: `${interaction.guild.name}`, inline: true }
                    )
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        await interaction.reply({ content: 'Une erreur est survenue lors de la mise en timeout de l\'utilisateur.', ephemeral: true });
        console.error(error);
    }
}