import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import {
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonInteraction,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    type ChatInputCommandInteraction,
    ModalBuilder,
    PermissionFlagsBits,
    RoleSelectMenuBuilder,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
    type Guild,
    type MessageComponentInteraction
} from 'discord.js';
import {
    getBirthdayChannel,
    getLogChannel,
    getModerationChannel,
    getMuteRole,
    getReportChannel,
    getReportRole,
    getTicketConfig,
    updateBirthdayChannel,
    updateLogChannel,
    updateModerationChannel,
    updateMuteRole,
    updateReportChannel,
    updateReportRole,
    updateTicketConfig
} from '../../database/db.ts';
import { logger } from '../../utils/logger.ts';

type ConfigSection = 'logs' | 'moderation' | 'birthdays' | 'mute' | 'reports' | 'tickets';

const PANEL_COLOR = KEPLER_COLORS.primary;
const PANEL_TIMEOUT = 5 * 60 * 1000;

export const data = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Ouvre le panneau de configuration du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({ content: 'Ce panneau est réservé aux administrateurs.', ephemeral: true });
        return;
    }

    const response = await interaction.reply({
        ...(await buildOverview(interaction)),
        ephemeral: true,
        fetchReply: true
    });

    const collector = response.createMessageComponentCollector({ time: PANEL_TIMEOUT });

    collector.on('collect', async component => {
        if (component.user.id !== interaction.user.id) {
            await component.reply({ content: 'Ce panneau appartient à un autre administrateur.', ephemeral: true });
            return;
        }
        const currentMember = await interaction.guild!.members.fetch(component.user.id).catch(() => null);
        if (!currentMember?.permissions.has(PermissionFlagsBits.Administrator)) {
            await component.reply({
                content: 'Vos permissions administrateur ne sont plus valides.',
                ephemeral: true
            });
            return;
        }

        try {
            await handleComponent(component, interaction);
        } catch (error) {
            logger.error('Erreur dans le panneau de configuration', error, 'SettingsPanel');
            const content = error instanceof Error
                ? `❌ ${error.message}`
                : '❌ Une erreur est survenue pendant la mise à jour.';
            if (component.deferred || component.replied) await component.followUp({ content, ephemeral: true });
            else await component.reply({ content, ephemeral: true });
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
    const guild = source.guild!;

    if (component.isButton()) {
        if (component.customId === 'settings:home' || component.customId === 'settings:refresh') {
            await component.update(await buildOverview(source));
            return;
        }
        if (component.customId === 'settings:close') {
            await component.update({ content: 'Panneau de configuration fermé.', embeds: [], components: [] });
            return;
        }
        if (component.customId.startsWith('settings:section:')) {
            const section = component.customId.split(':')[2] as ConfigSection;
            await component.update(await buildSection(section, guild));
            return;
        }
        if (component.customId.startsWith('settings:disable:')) {
            const section = component.customId.split(':')[2] as ConfigSection;
            await component.update(buildDisableConfirmation(section));
            return;
        }
        if (component.customId.startsWith('settings:confirm-disable:')) {
            const section = component.customId.split(':')[2] as ConfigSection;
            await component.deferUpdate();
            await disableSection(section, guild.id);
            await confirmSettingChange(component, source, section, `${sectionLabel(section)} désactivé.`);
            return;
        }
        if (component.customId === 'settings:create-mute') {
            await component.update(buildMuteCreationConfirmation());
            return;
        }
        if (component.customId === 'settings:tickets:customize') {
            await customizeTicketPanel(component, source);
            return;
        }
        if (component.customId === 'settings:tickets:publish') {
            await component.deferUpdate();
            try {
                await publishTicketPanel(source);
                await confirmSettingChange(component, source, 'tickets', 'Panneau de tickets publié.');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Impossible de publier le panneau.';
                await component.followUp({ content: `❌ ${message}`, ephemeral: true });
            }
            return;
        }
        if (component.customId === 'settings:clear-report-role') {
            await component.deferUpdate();
            await updateReportRole(guild.id, '');
            await confirmSettingChange(component, source, 'reports', 'Le rôle mentionné lors des reports a été retiré.');
            return;
        }
        if (component.customId === 'settings:confirm-create-mute') {
            await component.deferUpdate();
            const result = await createMuteRole(guild, source.user.tag);
            await confirmSettingChange(
                component,
                source,
                'mute',
                `Rôle ${result.role} créé. Permissions appliquées dans ${result.success}/${result.total} salons.`
            );
        }
        return;
    }

    if (component.isChannelSelectMenu()) {
        const channelId = component.values[0];
        await component.deferUpdate();
        if (component.customId === 'settings:select:tickets-category') {
            await updateTicketConfig(guild.id, { ticket_category_id: channelId });
            await confirmSettingChange(component, source, 'tickets', `Catégorie des tickets configurée sur <#${channelId}>.`);
            return;
        }
        if (component.customId === 'settings:select:tickets-logs') {
            await updateTicketConfig(guild.id, { ticket_log_channel_id: channelId });
            await confirmSettingChange(component, source, 'tickets', `Salon des logs de tickets configuré sur <#${channelId}>.`);
            return;
        }
        if (component.customId === 'settings:select:tickets-channel') {
            await updateTicketConfig(guild.id, { ticket_panel_channel_id: channelId });
            await confirmSettingChange(component, source, 'tickets', `Salon du panneau configuré sur <#${channelId}>.`);
            return;
        }
        if (component.customId === 'settings:select:reports-channel') {
            await updateReportChannel(guild.id, channelId);
            await confirmSettingChange(component, source, 'reports', `Salon des reports configuré sur <#${channelId}>.`);
            return;
        }
        const section = component.customId.split(':')[2] as ConfigSection;
        await updateChannelSection(section, guild.id, channelId);
        await confirmSettingChange(component, source, section, `${sectionLabel(section)} configuré sur <#${channelId}>.`);
        return;
    }

    if (component.isRoleSelectMenu()) {
        const roleId = component.values[0];
        const role = guild.roles.cache.get(roleId) ?? await guild.roles.fetch(roleId);
        if (component.customId === 'settings:select:tickets-role') {
            if (!role || role.id === guild.roles.everyone.id) {
                await component.reply({ content: KEPLER_MESSAGES.invalidRole, ephemeral: true });
                return;
            }
            await component.deferUpdate();
            await updateTicketConfig(guild.id, { ticket_support_role_id: role.id });
            await confirmSettingChange(component, source, 'tickets', `Rôle support configuré sur ${role}.`);
            return;
        }
        if (component.customId === 'settings:select:reports-role') {
            if (!role) {
                await component.reply({ content: KEPLER_MESSAGES.invalidRole, ephemeral: true });
                return;
            }
            await component.deferUpdate();
            await updateReportRole(guild.id, role.id);
            await confirmSettingChange(component, source, 'reports', `Rôle de report configuré sur ${role}.`);
            return;
        }
        const botMember = guild.members.me;
        if (!role || !botMember || role.position >= botMember.roles.highest.position) {
            await component.reply({
                content: 'Je ne peux pas gérer ce rôle. Placez-le sous mon rôle le plus élevé.',
                ephemeral: true
            });
            return;
        }

        await component.deferUpdate();
        await updateMuteRole(guild.id, role.id);
        await confirmSettingChange(component, source, 'mute', `Rôle de mute configuré sur ${role}.`);
    }
}

async function buildOverview(interaction: ChatInputCommandInteraction, notice?: string) {
    const guild = interaction.guild!;
    const [logs, moderation, birthdays, mute, reports, reportRole, tickets] = await Promise.all([
        getLogChannel(guild.id),
        getModerationChannel(guild.id),
        getBirthdayChannel(guild.id),
        getMuteRole(guild.id),
        getReportChannel(guild.id),
        getReportRole(guild.id),
        getTicketConfig(guild.id)
    ]);

    const embed = createKeplerEmbed()
        .setColor(PANEL_COLOR)
        .setAuthor({
            name: `${interaction.client.user.username} // Configuration`,
            iconURL: interaction.client.user.displayAvatarURL({ forceStatic: true })
        })
        .setTitle(`Configuration de ${guild.name}`)
        .setDescription(notice ? `✅ ${notice}` : 'Sélectionnez une catégorie pour modifier sa configuration.')
        .addFields(
            { name: '📑 Logs serveur', value: formatChannel(guild, logs), inline: true },
            { name: '🛡️ Modération', value: formatChannel(guild, moderation), inline: true },
            { name: '🎂 Anniversaires', value: formatChannel(guild, birthdays), inline: true },
            { name: '🔇 Rôle de mute', value: formatRole(guild, mute), inline: true },
            { name: '🚩 Salon des reports', value: formatChannel(guild, reports), inline: true },
            { name: '📣 Rôle mentionné', value: formatOptionalRole(guild, reportRole), inline: true },
            { name: '🎫 Panneau de tickets', value: formatChannel(guild, tickets.ticket_panel_channel_id), inline: true },
            { name: '📁 Catégorie des tickets', value: formatChannel(guild, tickets.ticket_category_id), inline: true },
            { name: '🧾 Logs des tickets', value: formatChannel(guild, tickets.ticket_log_channel_id), inline: true },
            { name: '🧑‍💻 Rôle support', value: formatOptionalRole(guild, tickets.ticket_support_role_id), inline: true }
        )
        .setFooter({ text: 'Panneau privé • expiration dans 5 minutes' })
        .setTimestamp();

    const categories = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('settings:section:logs').setLabel('Logs').setEmoji('📑').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:section:moderation').setLabel('Modération').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:section:birthdays').setLabel('Anniversaires').setEmoji('🎂').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:section:mute').setLabel('Mute').setEmoji('🔇').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:section:reports').setLabel('Reports').setEmoji('🚩').setStyle(ButtonStyle.Secondary)
    );
    const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('settings:section:tickets').setLabel('Tickets').setEmoji('🎫').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:refresh').setEmoji('🔄').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('settings:close').setEmoji('✖️').setStyle(ButtonStyle.Secondary)
    );

    return { content: '', embeds: [embed], components: [categories, actions] };
}

async function buildSection(section: ConfigSection, guild: Guild) {
    const embed = createKeplerEmbed()
        .setColor(PANEL_COLOR)
        .setTitle(sectionLabel(section))
        .setDescription(sectionDescription(section))
        .setFooter({ text: guild.name });

    if (section === 'tickets') {
        const config = await getTicketConfig(guild.id);
        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId('settings:select:tickets-channel')
            .setPlaceholder('Salon où publier le panneau')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setMinValues(1)
            .setMaxValues(1);
        if (config.ticket_panel_channel_id && guild.channels.cache.has(config.ticket_panel_channel_id)) {
            channelSelect.setDefaultChannels(config.ticket_panel_channel_id);
        }
        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId('settings:select:tickets-role')
            .setPlaceholder('Rôle autorisé à voir les tickets')
            .setMinValues(1)
            .setMaxValues(1);
        if (config.ticket_support_role_id && guild.roles.cache.has(config.ticket_support_role_id)) {
            roleSelect.setDefaultRoles(config.ticket_support_role_id);
        }
        const categorySelect = new ChannelSelectMenuBuilder()
            .setCustomId('settings:select:tickets-category')
            .setPlaceholder('Catégorie où créer les tickets')
            .addChannelTypes(ChannelType.GuildCategory)
            .setMinValues(1)
            .setMaxValues(1);
        if (config.ticket_category_id && guild.channels.cache.has(config.ticket_category_id)) {
            categorySelect.setDefaultChannels(config.ticket_category_id);
        }
        const logChannelSelect = new ChannelSelectMenuBuilder()
            .setCustomId('settings:select:tickets-logs')
            .setPlaceholder('Salon des états et archives')
            .addChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1);
        if (config.ticket_log_channel_id && guild.channels.cache.has(config.ticket_log_channel_id)) {
            logChannelSelect.setDefaultChannels(config.ticket_log_channel_id);
        }
        return {
            content: '',
            embeds: [embed],
            components: [
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect),
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(categorySelect),
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect),
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(logChannelSelect),
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('settings:tickets:customize').setLabel('Personnaliser').setEmoji('✏️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('settings:tickets:publish').setLabel('Publier').setEmoji('📨').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('settings:disable:tickets').setLabel('Désactiver').setStyle(ButtonStyle.Danger),
                    backButton()
                )
            ]
        };
    }

    if (section === 'reports') {
        const [configuredChannelId, configuredRoleId] = await Promise.all([
            getReportChannel(guild.id),
            getReportRole(guild.id)
        ]);
        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId('settings:select:reports-channel')
            .setPlaceholder('Choisir le salon des reports')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setMinValues(1)
            .setMaxValues(1);
        if (configuredChannelId && guild.channels.cache.has(configuredChannelId)) {
            channelSelect.setDefaultChannels(configuredChannelId);
        }
        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId('settings:select:reports-role')
            .setPlaceholder('Choisir le rôle à mentionner (facultatif)')
            .setMinValues(1)
            .setMaxValues(1);
        if (configuredRoleId && guild.roles.cache.has(configuredRoleId)) {
            roleSelect.setDefaultRoles(configuredRoleId);
        }
        return {
            content: '',
            embeds: [embed],
            components: [
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect),
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect),
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('settings:clear-report-role').setLabel('Retirer le rôle').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('settings:disable:reports').setLabel('Désactiver').setStyle(ButtonStyle.Danger),
                    backButton()
                )
            ]
        };
    }

    if (section === 'mute') {
        const configuredRoleId = await getMuteRole(guild.id);
        const select = new RoleSelectMenuBuilder()
            .setCustomId('settings:select:mute')
            .setPlaceholder('Choisir un rôle existant')
            .setMinValues(1)
            .setMaxValues(1);
        if (configuredRoleId && guild.roles.cache.has(configuredRoleId)) {
            select.setDefaultRoles(configuredRoleId);
        }
        return {
            content: '',
            embeds: [embed],
            components: [
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(select),
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('settings:create-mute').setLabel('Créer le rôle').setEmoji('➕').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('settings:disable:mute').setLabel('Utiliser les timeouts').setStyle(ButtonStyle.Danger),
                    backButton()
                )
            ]
        };
    }

    const configuredChannelId = section === 'logs'
        ? await getLogChannel(guild.id)
        : section === 'moderation'
            ? await getModerationChannel(guild.id)
            : await getBirthdayChannel(guild.id);
    const select = new ChannelSelectMenuBuilder()
        .setCustomId(`settings:select:${section}`)
        .setPlaceholder('Choisir un salon textuel')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setMinValues(1)
        .setMaxValues(1);
    if (configuredChannelId && guild.channels.cache.has(configuredChannelId)) {
        select.setDefaultChannels(configuredChannelId);
    }
    return {
        content: '',
        embeds: [embed],
        components: [
            new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(select),
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId(`settings:disable:${section}`).setLabel('Désactiver').setStyle(ButtonStyle.Danger),
                backButton()
            )
        ]
    };
}

function buildDisableConfirmation(section: ConfigSection) {
    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.danger)
        .setTitle('Confirmer la désactivation')
        .setDescription(`La configuration « ${sectionLabel(section)} » sera supprimée.`);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`settings:confirm-disable:${section}`).setLabel('Confirmer').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`settings:section:${section}`).setLabel('Annuler').setStyle(ButtonStyle.Secondary)
    );
    return { content: '', embeds: [embed], components: [row] };
}

function buildMuteCreationConfirmation() {
    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.warning)
        .setTitle('Créer un rôle de mute')
        .setDescription('Kepler créera le rôle `Muted` et appliquera ses restrictions à tous les salons compatibles.');
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('settings:confirm-create-mute').setLabel('Créer et configurer').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('settings:section:mute').setLabel('Annuler').setStyle(ButtonStyle.Secondary)
    );
    return { content: '', embeds: [embed], components: [row] };
}

async function updateChannelSection(section: ConfigSection, guildId: string, channelId: string) {
    if (section === 'logs') await updateLogChannel(guildId, channelId);
    else if (section === 'moderation') await updateModerationChannel(guildId, channelId);
    else if (section === 'birthdays') await updateBirthdayChannel(guildId, channelId);
}

async function disableSection(section: ConfigSection, guildId: string) {
    if (section === 'logs') await updateLogChannel(guildId, '');
    else if (section === 'moderation') await updateModerationChannel(guildId, '');
    else if (section === 'birthdays') await updateBirthdayChannel(guildId, '');
    else if (section === 'reports') {
        await Promise.all([updateReportChannel(guildId, ''), updateReportRole(guildId, '')]);
    } else if (section === 'tickets') {
        await updateTicketConfig(guildId, {
            ticket_panel_channel_id: null,
            ticket_category_id: null,
            ticket_log_channel_id: null,
            ticket_support_role_id: null
        });
    } else await updateMuteRole(guildId, '');
}

async function customizeTicketPanel(component: ButtonInteraction, source: ChatInputCommandInteraction) {
    const config = await getTicketConfig(source.guild!.id);
    const modalId = `settings:tickets:modal:${source.id}`;
    const title = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Titre du panneau')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(256)
        .setValue(config.ticket_panel_title)
        .setRequired(true);
    const message = new TextInputBuilder()
        .setCustomId('message')
        .setLabel('Message du panneau')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(1)
        .setMaxLength(2000)
        .setValue(config.ticket_panel_message)
        .setRequired(true);
    const label = new TextInputBuilder()
        .setCustomId('label')
        .setLabel('Texte du bouton')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(80)
        .setValue(config.ticket_button_label)
        .setRequired(true);
    const emoji = new TextInputBuilder()
        .setCustomId('emoji')
        .setLabel('Emoji du bouton (facultatif)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(false);
    if (config.ticket_button_emoji) emoji.setValue(config.ticket_button_emoji);
    const style = new TextInputBuilder()
        .setCustomId('style')
        .setLabel('Couleur : bleu, gris, vert ou rouge')
        .setStyle(TextInputStyle.Short)
        .setMinLength(3)
        .setMaxLength(5)
        .setValue(ticketStyleLabel(config.ticket_button_style))
        .setRequired(true);

    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle('Personnaliser le panneau')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(title),
            new ActionRowBuilder<TextInputBuilder>().addComponents(message),
            new ActionRowBuilder<TextInputBuilder>().addComponents(label),
            new ActionRowBuilder<TextInputBuilder>().addComponents(emoji),
            new ActionRowBuilder<TextInputBuilder>().addComponents(style)
        );
    await component.showModal(modal);

    try {
        const submission = await component.awaitModalSubmit({
            filter: modalInteraction =>
                modalInteraction.user.id === source.user.id && modalInteraction.customId === modalId,
            time: PANEL_TIMEOUT
        });
        await submission.deferUpdate();
        const buttonEmoji = submission.fields.getTextInputValue('emoji').trim();
        const buttonStyle = parseTicketStyle(submission.fields.getTextInputValue('style'));
        if (!buttonStyle) {
            await submission.followUp({
                content: '❌ Couleur invalide. Utilisez `bleu`, `gris`, `vert` ou `rouge`.',
                ephemeral: true
            });
            return;
        }
        if (buttonEmoji) {
            try {
                new ButtonBuilder().setCustomId('ticket:emoji-validation').setEmoji(buttonEmoji);
            } catch {
                await submission.followUp({ content: '❌ L’emoji indiqué n’est pas valide.', ephemeral: true });
                return;
            }
        }
        await updateTicketConfig(source.guild!.id, {
            ticket_panel_title: submission.fields.getTextInputValue('title').trim(),
            ticket_panel_message: submission.fields.getTextInputValue('message').trim(),
            ticket_button_label: submission.fields.getTextInputValue('label').trim(),
            ticket_button_emoji: buttonEmoji || null,
            ticket_button_style: buttonStyle
        });
        await submission.editReply(await buildSection('tickets', source.guild!));
        await submission.followUp({
            content: '✅ Personnalisation du panneau de tickets enregistrée.',
            ephemeral: true
        });
    } catch (error: any) {
        if (error?.code !== 'InteractionCollectorError') throw error;
    }
}

async function publishTicketPanel(source: ChatInputCommandInteraction) {
    const guild = source.guild!;
    const config = await getTicketConfig(guild.id);
    if (!config.ticket_panel_channel_id) {
        throw new Error('Configurez d’abord le salon du panneau de tickets.');
    }
    const channel = await guild.channels.fetch(config.ticket_panel_channel_id);
    if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
        throw new Error('Le salon configuré pour les tickets est invalide.');
    }
    const botMember = guild.members.me;
    const permissions = botMember ? channel.permissionsFor(botMember) : null;
    if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        throw new Error('Le bot ne peut pas envoyer de panneau dans ce salon.');
    }

    const embed = createKeplerEmbed()
        .setColor(PANEL_COLOR)
        .setTitle(config.ticket_panel_title)
        .setDescription(config.ticket_panel_message)
        .setFooter({ text: guild.name });
    const button = new ButtonBuilder()
        .setCustomId('ticket:open')
        .setLabel(config.ticket_button_label)
        .setStyle(ticketButtonStyle(config.ticket_button_style));
    if (config.ticket_button_emoji) button.setEmoji(config.ticket_button_emoji);
    await channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
        allowedMentions: { parse: [] }
    });
}

function parseTicketStyle(value: string): 'Primary' | 'Secondary' | 'Success' | 'Danger' | null {
    return ({
        bleu: 'Primary',
        gris: 'Secondary',
        vert: 'Success',
        rouge: 'Danger'
    } as const)[value.trim().toLowerCase() as 'bleu' | 'gris' | 'vert' | 'rouge'] ?? null;
}

function ticketStyleLabel(style: string): string {
    return ({
        Primary: 'bleu',
        Secondary: 'gris',
        Success: 'vert',
        Danger: 'rouge'
    } as Record<string, string>)[style] || 'bleu';
}

function ticketButtonStyle(style: string): ButtonStyle {
    return ({
        Primary: ButtonStyle.Primary,
        Secondary: ButtonStyle.Secondary,
        Success: ButtonStyle.Success,
        Danger: ButtonStyle.Danger
    } as Record<string, ButtonStyle>)[style] ?? ButtonStyle.Primary;
}

async function confirmSettingChange(
    component: MessageComponentInteraction,
    source: ChatInputCommandInteraction,
    section: ConfigSection,
    message: string
) {
    await component.editReply(await buildSection(section, source.guild!));
    await component.followUp({ content: `✅ ${message}`, ephemeral: true });
}

async function createMuteRole(guild: Guild, userTag: string) {
    const role = await guild.roles.create({
        name: 'Muted',
        color: '#52627c',
        permissions: [],
        reason: `Rôle de mute créé depuis /settings par ${userTag}`
    });

    let success = 0;
    let total = 0;
    await Promise.all(guild.channels.cache.map(async channel => {
        if (channel.isThread() || (!channel.isTextBased() && !channel.isVoiceBased())) return;
        total++;
        try {
            await channel.permissionOverwrites.create(role, {
                SendMessages: false,
                AddReactions: false,
                Speak: false,
                Stream: false,
                UseApplicationCommands: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                SendMessagesInThreads: false
            });
            success++;
        } catch (error) {
            logger.warn(`Permissions de mute non appliquées dans ${channel.name}`, error, 'SettingsPanel');
        }
    }));
    await updateMuteRole(guild.id, role.id);
    return { role, success, total };
}

function sectionLabel(section: ConfigSection): string {
    return ({
        logs: 'Logs serveur',
        moderation: 'Logs de modération',
        birthdays: 'Annonces d’anniversaire',
        mute: 'Rôle de mute',
        reports: 'Signalements',
        tickets: 'Tickets'
    })[section];
}

function sectionDescription(section: ConfigSection): string {
    return ({
        logs: 'Choisissez le salon qui recevra les événements généraux du serveur.',
        moderation: 'Choisissez le salon qui recevra les sanctions et actions de modération.',
        birthdays: 'Choisissez le salon dans lequel les anniversaires seront annoncés.',
        mute: 'Sélectionnez un rôle existant, créez-en un automatiquement ou utilisez les timeouts Discord.',
        reports: 'Choisissez le salon qui recevra les signalements et, si nécessaire, le rôle de modération à mentionner.',
        tickets: 'Choisissez où publier le panneau, le rôle support, puis personnalisez son message et son bouton.'
    })[section];
}

function formatChannel(guild: Guild, channelId: string | null): string {
    if (!channelId) return '⚪ Non configuré';
    return guild.channels.cache.has(channelId) ? `🟢 <#${channelId}>` : '🟠 Salon introuvable';
}

function formatRole(guild: Guild, roleId: string | null): string {
    if (!roleId) return '⚪ Timeouts Discord';
    return guild.roles.cache.has(roleId) ? `🟢 <@&${roleId}>` : '🟠 Rôle introuvable';
}

function formatOptionalRole(guild: Guild, roleId: string | null): string {
    if (!roleId) return '⚪ Aucun rôle';
    return guild.roles.cache.has(roleId) ? `🟢 <@&${roleId}>` : '🟠 Rôle introuvable';
}

function backButton(): ButtonBuilder {
    return new ButtonBuilder().setCustomId('settings:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
}
