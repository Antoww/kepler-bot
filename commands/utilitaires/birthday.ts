import { createKeplerEmbed, KEPLER_MESSAGES, setRequesterFooter } from '../../utils/theme.ts';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type ChatInputCommandInteraction,
    type Guild,
    type MessageComponentInteraction,
    SlashCommandBuilder,
    type User,
    UserSelectMenuBuilder
} from 'discord.js';
import { deleteBirthday, getAllBirthdays, getBirthday, getBirthdayChannel, setBirthday } from '../../database/db.ts';
import { logger } from '../../utils/logger.ts';

const PANEL_TIMEOUT = 5 * 60 * 1000;
const LIST_PAGE_SIZE = 20;
const MONTHS = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

export const data = new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Gérez les anniversaires du serveur')
    .addSubcommand(subcommand => subcommand
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
    .addSubcommand(subcommand => subcommand
        .setName('menu')
        .setDescription('Ouvrir le panneau des anniversaires'));

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }

    try {
        if (interaction.options.getSubcommand() === 'set') {
            await handleSetBirthday(interaction);
        } else {
            await openPanel(interaction);
        }
    } catch (error) {
        logger.error('Erreur dans la commande birthday', error, 'Birthday');
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: KEPLER_MESSAGES.unexpectedError, embeds: [], components: [] });
        } else {
            await interaction.reply({ content: KEPLER_MESSAGES.unexpectedError, ephemeral: true });
        }
    }
}

async function handleSetBirthday(interaction: ChatInputCommandInteraction) {
    const day = interaction.options.getInteger('jour', true);
    const month = interaction.options.getInteger('mois', true);
    const year = interaction.options.getInteger('année') ?? undefined;

    if (!validateDate(day, month, year)) {
        await interaction.reply({ content: '❌ Cette date n’est pas valide. Vérifiez le jour et le mois.', ephemeral: true });
        return;
    }

    await setBirthday(interaction.guild!.id, interaction.user.id, day, month, year);
    const embed = setRequesterFooter(
        createKeplerEmbed('success')
            .setTitle('🎂 Anniversaire enregistré')
            .setDescription(`Votre anniversaire est maintenant défini au **${formatDate(day, month, year)}**.`),
        interaction.user
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function openPanel(interaction: ChatInputCommandInteraction) {
    const response = await interaction.reply({
        ...(await buildHome(interaction)),
        ephemeral: true,
        fetchReply: true
    });
    const collector = response.createMessageComponentCollector({ time: PANEL_TIMEOUT });

    collector.on('collect', async component => {
        if (component.user.id !== interaction.user.id) {
            await component.reply({ content: KEPLER_MESSAGES.unauthorizedComponent, ephemeral: true });
            return;
        }
        try {
            await handleComponent(component, interaction);
        } catch (error) {
            logger.error('Erreur dans le panneau des anniversaires', error, 'BirthdayPanel');
            const payload = { content: KEPLER_MESSAGES.unexpectedError, embeds: [], components: [] };
            if (component.deferred || component.replied) await component.editReply(payload);
            else await component.reply({ content: payload.content, ephemeral: true });
        }
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply({ components: [] });
        } catch {
            // Le message éphémère peut déjà avoir été fermé.
        }
    });
}

async function handleComponent(component: MessageComponentInteraction, source: ChatInputCommandInteraction) {
    if (component.isButton()) {
        if (component.customId === 'birthday:home') {
            await component.update(await buildHome(source));
        } else if (component.customId === 'birthday:close') {
            await component.update({ content: 'Panneau des anniversaires fermé.', embeds: [], components: [] });
        } else if (component.customId === 'birthday:view') {
            await component.update(buildUserSelection('view'));
        } else if (component.customId === 'birthday:celebrate') {
            await component.update(buildUserSelection('celebrate'));
        } else if (component.customId === 'birthday:remove') {
            await component.update(buildRemoveConfirmation());
        } else if (component.customId === 'birthday:confirm-remove') {
            await component.deferUpdate();
            const birthday = await getBirthday(source.guild!.id, source.user.id);
            if (birthday) await deleteBirthday(source.guild!.id, source.user.id);
            await component.editReply(await buildHome(
                source,
                birthday ? 'Votre anniversaire a été supprimé.' : 'Vous n’avez aucun anniversaire enregistré.'
            ));
        } else if (component.customId === 'birthday:list') {
            await component.deferUpdate();
            await component.editReply(await buildBirthdayList(source.guild!, 0));
        } else if (component.customId.startsWith('birthday:page:')) {
            await component.deferUpdate();
            await component.editReply(await buildBirthdayList(source.guild!, Number(component.customId.split(':')[2])));
        }
        return;
    }

    if (!component.isUserSelectMenu()) return;
    const user = component.users.first();
    if (!user) {
        await component.reply({ content: KEPLER_MESSAGES.invalidUser, ephemeral: true });
        return;
    }
    await component.deferUpdate();
    if (component.customId === 'birthday:select:view') {
        await component.editReply(await buildBirthdayDetails(source.guild!, user, source.user));
    } else if (component.customId === 'birthday:select:celebrate') {
        const notice = await celebrateBirthday(source, user);
        await component.editReply(await buildHome(source, notice));
    }
}

async function buildHome(interaction: ChatInputCommandInteraction, notice?: string) {
    const [birthday, channelId] = await Promise.all([
        getBirthday(interaction.guild!.id, interaction.user.id),
        getBirthdayChannel(interaction.guild!.id)
    ]);
    const ownBirthday = birthday
        ? formatDate(birthday.birth_day, birthday.birth_month, birthday.birth_year ?? undefined)
        : 'Non défini · utilisez `/birthday set`';
    const channel = channelId && interaction.guild!.channels.cache.has(channelId)
        ? `<#${channelId}>`
        : 'Non configuré';
    const embed = createKeplerEmbed('highlight')
        .setAuthor({
            name: `${interaction.client.user.username} // Anniversaires`,
            iconURL: interaction.client.user.displayAvatarURL({ forceStatic: true })
        })
        .setTitle(`Anniversaires de ${interaction.guild!.name}`)
        .setDescription(notice ? `✅ ${notice}` : 'Choisissez une action dans le menu.')
        .addFields(
            { name: '🎂 Votre anniversaire', value: ownBirthday, inline: true },
            { name: '📣 Salon d’annonce', value: channel, inline: true }
        )
        .setFooter({ text: 'Panneau privé • expiration dans 5 minutes' });
    const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('birthday:view').setLabel('Consulter').setEmoji('🔎').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('birthday:list').setLabel('Liste').setEmoji('📅').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('birthday:celebrate').setLabel('Célébrer').setEmoji('🎉').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('birthday:remove').setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    );
    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('birthday:home').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('birthday:close').setEmoji('✖️').setStyle(ButtonStyle.Secondary)
    );
    return { content: '', embeds: [embed], components: [actions, controls] };
}

function buildUserSelection(action: 'view' | 'celebrate') {
    const isCelebrate = action === 'celebrate';
    const embed = createKeplerEmbed(isCelebrate ? 'highlight' : 'primary')
        .setTitle(isCelebrate ? '🎉 Célébrer un anniversaire' : '🔎 Consulter un anniversaire')
        .setDescription(isCelebrate
            ? 'Sélectionnez la personne à célébrer. Le message sera publié dans le salon configuré.'
            : 'Sélectionnez la personne dont vous souhaitez consulter l’anniversaire.');
    const select = new UserSelectMenuBuilder()
        .setCustomId(`birthday:select:${action}`)
        .setPlaceholder('Choisir un membre')
        .setMinValues(1)
        .setMaxValues(1);
    return {
        content: '',
        embeds: [embed],
        components: [
            new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select),
            new ActionRowBuilder<ButtonBuilder>().addComponents(backButton())
        ]
    };
}

function buildRemoveConfirmation() {
    const embed = createKeplerEmbed('danger')
        .setTitle('Supprimer votre anniversaire ?')
        .setDescription('Cette action retire votre date d’anniversaire de ce serveur.');
    return {
        content: '',
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('birthday:confirm-remove').setLabel('Confirmer').setStyle(ButtonStyle.Danger),
            backButton()
        )]
    };
}

async function buildBirthdayDetails(guild: Guild, target: User, requester: User) {
    const birthday = await getBirthday(guild.id, target.id);
    if (!birthday) {
        return panelPayload(setRequesterFooter(
            createKeplerEmbed('neutral')
                .setTitle('🎂 Anniversaire non défini')
                .setDescription(`**${target.username}** n’a pas encore enregistré son anniversaire.`)
                .setThumbnail(target.displayAvatarURL({ forceStatic: true })),
            requester
        ));
    }

    const age = birthday.birth_year
        ? calculateAge(birthday.birth_day, birthday.birth_month, birthday.birth_year)
        : null;
    return panelPayload(setRequesterFooter(
        createKeplerEmbed('highlight')
            .setTitle(`🎂 Anniversaire de ${target.username}`)
            .setDescription(`**${formatDate(birthday.birth_day, birthday.birth_month, birthday.birth_year ?? undefined)}**${age === null ? '' : ` · ${age} ans`}`)
            .setThumbnail(target.displayAvatarURL({ forceStatic: true })),
        requester
    ));
}

async function buildBirthdayList(guild: Guild, requestedPage: number) {
    const birthdays = (await getAllBirthdays(guild.id)).sort((a, b) =>
        a.birth_month - b.birth_month || a.birth_day - b.birth_day
    );
    if (birthdays.length === 0) {
        return panelPayload(createKeplerEmbed('neutral')
            .setTitle('🎂 Anniversaires du serveur')
            .setDescription('Aucun anniversaire n’est enregistré sur ce serveur.'));
    }

    const totalPages = Math.ceil(birthdays.length / LIST_PAGE_SIZE);
    const page = Math.max(0, Math.min(requestedPage, totalPages - 1));
    const entries = birthdays.slice(page * LIST_PAGE_SIZE, (page + 1) * LIST_PAGE_SIZE);
    const embed = createKeplerEmbed('highlight')
        .setTitle('🎂 Anniversaires du serveur')
        .setDescription(entries.map(birthday =>
            `**${birthday.birth_day} ${MONTHS[birthday.birth_month - 1]}** · <@${birthday.user_id}>`
        ).join('\n'))
        .setFooter({ text: `${birthdays.length} anniversaire(s) • page ${page + 1}/${totalPages}` });
    const navigation = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`birthday:page:${page - 1}`).setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        backButton(),
        new ButtonBuilder().setCustomId(`birthday:page:${page + 1}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1)
    );
    return { content: '', embeds: [embed], components: [navigation] };
}

async function celebrateBirthday(interaction: ChatInputCommandInteraction, target: User): Promise<string> {
    const embed = createKeplerEmbed('highlight')
        .setTitle('🎉 Joyeux anniversaire !')
        .setDescription(`Aujourd’hui, nous célébrons **${target.username}** ! 🎂`)
        .addFields({ name: '🎈 Tous ensemble', value: `Joyeux anniversaire <@${target.id}> !`, inline: false })
        .setThumbnail(target.displayAvatarURL({ forceStatic: false }));
    const channelId = await getBirthdayChannel(interaction.guild!.id);
    if (!channelId) return 'Aucun salon d’anniversaire n’est configuré dans `/settings`.';

    const channel = await interaction.guild!.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return 'Le salon d’anniversaire configuré est introuvable.';
    await channel.send({ embeds: [embed] });
    return `L’anniversaire de ${target.username} a été célébré dans ${channel}.`;
}

function panelPayload(embed: ReturnType<typeof createKeplerEmbed>) {
    return {
        content: '',
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(backButton())]
    };
}

function backButton(): ButtonBuilder {
    return new ButtonBuilder()
        .setCustomId('birthday:home')
        .setLabel('Retour')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary);
}

function formatDate(day: number, month: number, year?: number): string {
    return `${day} ${MONTHS[month - 1]}${year ? ` ${year}` : ''}`;
}

function calculateAge(day: number, month: number, year: number): number {
    const today = new Date();
    let age = today.getFullYear() - year;
    if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
    return age;
}

function validateDate(day: number, month: number, year?: number): boolean {
    const referenceYear = year ?? 2000;
    const date = new Date(referenceYear, month - 1, day);
    return date.getFullYear() === referenceYear
        && date.getMonth() === month - 1
        && date.getDate() === day;
}
