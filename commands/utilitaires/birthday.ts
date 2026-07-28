import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder, User } from 'discord.js';
import { setBirthday, getBirthday, deleteBirthday, getAllBirthdays, getBirthdayChannel } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Gestion des anniversaires')
    .addSubcommand(subcommand =>
        subcommand
            .setName('set')
            .setDescription('Définir votre anniversaire')
            .addIntegerOption(option => option.setName('jour')
                .setDescription('Jour de naissance (1-31)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(31))
            .addIntegerOption(option => option.setName('mois')
                .setDescription('Mois de naissance (1-12)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(12))
            .addIntegerOption(option => option.setName('année')
                .setDescription('Année de naissance (optionnel)')
                .setRequired(false)
                .setMinValue(1900)
                .setMaxValue(2100)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('get')
            .setDescription('Voir l\'anniversaire d\'un utilisateur')
            .addUserOption(option => option.setName('utilisateur')
                .setDescription('L\'utilisateur dont voir l\'anniversaire')
                .setRequired(false)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Supprimer votre anniversaire'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Voir tous les anniversaires du serveur'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('celebrate')
            .setDescription('Souhaiter un joyeux anniversaire à quelqu\'un')
            .addUserOption(option => option.setName('utilisateur')
                .setDescription('L\'utilisateur qui fête son anniversaire')
                .setRequired(true)));

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply(KEPLER_MESSAGES.guildOnly);
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
        switch (subcommand) {
            case 'set':
                await handleSetBirthday(interaction);
                break;
            case 'get':
                await handleGetBirthday(interaction);
                break;
            case 'remove':
                await handleRemoveBirthday(interaction);
                break;
            case 'list':
                await handleListBirthdays(interaction);
                break;
            case 'celebrate':
                await handleCelebrateBirthday(interaction);
                break;
            default:
                await interaction.reply('Sous-commande non reconnue.');
        }
    } catch (error) {
        console.error('Erreur dans la commande birthday:', error);
        await interaction.reply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
    }
}

async function handleSetBirthday(interaction: CommandInteraction) {
    const day = interaction.options.getInteger('jour')!;
    const month = interaction.options.getInteger('mois')!;
    const year = interaction.options.getInteger('année');

    // Valider la date
    const isValidDate = validateDate(day, month, year);
    if (!isValidDate) {
        await interaction.reply('❌ Date invalide. Veuillez vérifier le jour et le mois.');
        return;
    }

    await setBirthday(interaction.guild!.id, interaction.user.id, day, month, year || undefined);

    const monthNames = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];

    const dateString = year
        ? `${day} ${monthNames[month - 1]} ${year}`
        : `${day} ${monthNames[month - 1]}`;

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username,
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.highlight)
        .setTitle('🎂 Anniversaire enregistré !')
        .setDescription(`Votre anniversaire a été défini au **${dateString}**`)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleGetBirthday(interaction: CommandInteraction) {
    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    const birthday = await getBirthday(interaction.guild!.id, targetUser.id);

    if (!birthday) {
        const message = targetUser.id === interaction.user.id
            ? 'Vous n\'avez pas encore défini votre anniversaire. Utilisez `/birthday set` pour le faire.'
            : `${targetUser.username} n'a pas encore défini son anniversaire.`;

        await interaction.reply(message);
        return;
    }

    const monthNames = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];

    const dateString = birthday.birth_year
        ? `${birthday.birth_day} ${monthNames[birthday.birth_month - 1]} ${birthday.birth_year}`
        : `${birthday.birth_day} ${monthNames[birthday.birth_month - 1]}`;

    // Calculer l'âge si l'année est fournie
    let ageString = '';
    if (birthday.birth_year) {
        const today = new Date();
        let age = today.getFullYear() - birthday.birth_year;
        const birthdayThisYear = new Date(today.getFullYear(), birthday.birth_month - 1, birthday.birth_day);

        if (today < birthdayThisYear) {
            age--;
        }

        ageString = ` (${age} ans)`;
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username,
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.highlight)
        .setTitle('🎂 Anniversaire')
        .setDescription(`**${targetUser.username}** est né(e) le **${dateString}**${ageString}`)
        .setThumbnail(targetUser.displayAvatarURL({ forceStatic: false }))
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRemoveBirthday(interaction: CommandInteraction) {
    const birthday = await getBirthday(interaction.guild!.id, interaction.user.id);

    if (!birthday) {
        await interaction.reply('Vous n\'avez pas d\'anniversaire enregistré.');
        return;
    }

    await deleteBirthday(interaction.guild!.id, interaction.user.id);

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username,
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.danger)
        .setTitle('🗑️ Anniversaire supprimé')
        .setDescription('Votre anniversaire a été supprimé de la base de données.')
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleListBirthdays(interaction: CommandInteraction) {
    const birthdays = await getAllBirthdays(interaction.guild!.id);

    if (birthdays.length === 0) {
        await interaction.reply('Aucun anniversaire n\'est enregistré sur ce serveur.');
        return;
    }

    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // Grouper par mois
    const birthdaysByMonth: { [key: number]: typeof birthdays } = {};
    birthdays.forEach(birthday => {
        if (!birthdaysByMonth[birthday.birth_month]) {
            birthdaysByMonth[birthday.birth_month] = [];
        }
        birthdaysByMonth[birthday.birth_month].push(birthday);
    });

    let description = '';
    for (let month = 1; month <= 12; month++) {
        if (birthdaysByMonth[month]) {
            description += `\n**${monthNames[month - 1]}**\n`;
            birthdaysByMonth[month]
                .sort((a, b) => a.birth_day - b.birth_day)
                .forEach(birthday => {
                    description += `• ${birthday.birth_day} - <@${birthday.user_id}>\n`;
                });
        }
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username,
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.highlight)
        .setTitle('🎂 Liste des anniversaires')
        .setDescription(description)
        .setFooter({
            text: `${birthdays.length} anniversaire(s) enregistré(s) • Demandé par ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCelebrateBirthday(interaction: CommandInteraction) {
    const targetUser = interaction.options.getUser('utilisateur')!;

    // Vérifier si un canal d'anniversaires est configuré
    const birthdayChannelId = await getBirthdayChannel(interaction.guild!.id);

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username,
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.highlight)
        .setTitle('🎉 Joyeux Anniversaire !')
        .setDescription(`**${targetUser.username}** fête son anniversaire aujourd'hui ! 🎂`)
        .addFields(
            { name: '🎁 Souhaits', value: 'Que cette journée soit remplie de joie et de bonheur !', inline: false },
            { name: '🎈 Célébration', value: 'Tous ensemble pour célébrer !', inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL({ forceStatic: false }))
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    // Si un canal d'anniversaires est configuré, envoyer le message là-bas aussi
    if (birthdayChannelId) {
        try {
            const birthdayChannel = await interaction.guild!.channels.fetch(birthdayChannelId);
            if (birthdayChannel && birthdayChannel.isTextBased()) {
                await birthdayChannel.send({ embeds: [embed] });
                await interaction.reply(`🎉 Message d'anniversaire envoyé dans ${birthdayChannel} !`);
                return;
            }
        } catch (error) {
            console.error('Erreur lors de l\'envoi dans le canal d\'anniversaires:', error);
        }
    }

    await interaction.reply({ embeds: [embed] });
}

function validateDate(day: number, month: number, year?: number): boolean {
    // Vérifier les limites de base
    if (day < 1 || day > 31 || month < 1 || month > 12) {
        return false;
    }

    // Vérifier les jours par mois
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Gérer les années bissextiles si l'année est fournie
    if (year && month === 2) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (isLeapYear && day <= 29) return true;
        if (!isLeapYear && day <= 28) return true;
        return false;
    }

    return day <= daysInMonth[month - 1];
}