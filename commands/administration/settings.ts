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
    StringSelectMenuBuilder,
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
    getServerTimezone,
    getTicketConfig,
    updateBirthdayChannel,
    updateLogChannel,
    updateModerationChannel,
    updateMuteRole,
    updateReportChannel,
    updateReportRole,
    updateServerTimezone,
    updateTicketConfig
} from '../../database/db.ts';
import { logger } from '../../utils/logger.ts';
import {
    canManageRewardRole,
    deleteXpReward,
    deleteXpRoleBoost,
    getXpRewards,
    getXpRoleBoosts,
    getXpSettings,
    setXpReward,
    setXpRoleBoost,
    updateXpSettings
} from '../../utils/xpSystem.ts';
import {
    COMMON_TIMEZONES,
    formatDateTimeInZone,
    isValidTimezone,
    parseDateTimeInZone
} from '../../utils/timezone.ts';

type ConfigSection = 'logs' | 'moderation' | 'birthdays' | 'mute' | 'reports' | 'tickets' | 'xp' | 'timezone';

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
        if (component.customId === 'settings:xp:home') {
            await component.update(await buildXpHome(guild));
            return;
        }
        if (component.customId === 'settings:xp:general') {
            await component.update(await buildXpGeneral(guild));
            return;
        }
        if (component.customId === 'settings:xp:toggle') {
            const settings = await getXpSettings(guild.id);
            await component.deferUpdate();
            await updateXpSettings(guild.id, { enabled: !settings.enabled });
            await component.editReply(await buildXpGeneral(guild));
            return;
        }
        if (component.customId === 'settings:xp:general-edit') {
            await showXpGeneralModal(component, source);
            return;
        }
        if (component.customId === 'settings:xp:clear-level-channel') {
            await component.deferUpdate();
            await updateXpSettings(guild.id, { level_up_channel_id: null });
            await component.editReply(await buildXpGeneral(guild));
            return;
        }
        if (component.customId === 'settings:xp:boosts') {
            await component.update(await buildXpBoosts(guild));
            return;
        }
        if (component.customId === 'settings:xp:boost-period') {
            await showXpBoostPeriodModal(component, source);
            return;
        }
        if (component.customId === 'settings:xp:boost-period-clear') {
            await component.deferUpdate();
            await updateXpSettings(guild.id, {
                boost_multiplier: 1,
                boost_starts_at: null,
                boost_ends_at: null
            });
            await component.editReply(await buildXpBoosts(guild));
            return;
        }
        if (component.customId === 'settings:xp:rewards') {
            await component.update(await buildXpRewards(guild));
            return;
        }
        if (component.customId === 'settings:xp:exclusions') {
            await component.update(await buildXpExclusions(guild));
            return;
        }
        if (component.customId === 'settings:xp:clear-excluded-channels') {
            await component.deferUpdate();
            await updateXpSettings(guild.id, { excluded_channel_ids: [] });
            await component.editReply(await buildXpExclusions(guild));
            return;
        }
        if (component.customId === 'settings:xp:clear-excluded-roles') {
            await component.deferUpdate();
            await updateXpSettings(guild.id, { excluded_role_ids: [] });
            await component.editReply(await buildXpExclusions(guild));
            return;
        }
        if (component.customId === 'settings:timezone:custom') {
            await showTimezoneModal(component, source);
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
        if (component.customId === 'settings:xp:level-channel') {
            await component.deferUpdate();
            await updateXpSettings(guild.id, { level_up_channel_id: channelId });
            await component.editReply(await buildXpGeneral(guild));
            return;
        }
        if (component.customId === 'settings:xp:excluded-channels') {
            await component.deferUpdate();
            await updateXpSettings(guild.id, { excluded_channel_ids: component.values });
            await component.editReply(await buildXpExclusions(guild));
            return;
        }
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
        if (component.customId === 'settings:xp:excluded-roles') {
            await component.deferUpdate();
            await updateXpSettings(guild.id, { excluded_role_ids: component.values });
            await component.editReply(await buildXpExclusions(guild));
            return;
        }
        if (component.customId === 'settings:xp:boost-role') {
            await showXpRoleBoostModal(component, source, roleId);
            return;
        }
        if (component.customId === 'settings:xp:reward-role') {
            if (!role || !canManageRewardRole(guild, role.id)) {
                await component.reply({
                    content: 'Je ne peux pas attribuer ce rôle. Placez-le sous mon rôle le plus élevé.',
                    ephemeral: true
                });
                return;
            }
            await showXpRewardModal(component, source, role.id);
            return;
        }
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

    if (component.isStringSelectMenu()) {
        await component.deferUpdate();
        if (component.customId === 'settings:timezone:common') {
            await updateServerTimezone(guild.id, component.values[0]);
            await component.editReply(await buildTimezoneSection(guild));
        } else if (component.customId === 'settings:xp:remove-boost') {
            await deleteXpRoleBoost(guild.id, component.values[0]);
            await component.editReply(await buildXpBoosts(guild));
        } else if (component.customId === 'settings:xp:remove-reward') {
            await deleteXpReward(guild.id, Number(component.values[0]));
            await component.editReply(await buildXpRewards(guild));
        }
    }
}

async function buildOverview(interaction: ChatInputCommandInteraction, notice?: string) {
    const guild = interaction.guild!;
    const [logs, moderation, birthdays, mute, reports, reportRole, tickets, xpSettings, xpRewards, timezone] = await Promise.all([
        getLogChannel(guild.id),
        getModerationChannel(guild.id),
        getBirthdayChannel(guild.id),
        getMuteRole(guild.id),
        getReportChannel(guild.id),
        getReportRole(guild.id),
        getTicketConfig(guild.id),
        getXpSettings(guild.id),
        getXpRewards(guild.id),
        getServerTimezone(guild.id)
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
            { name: '🧑‍💻 Rôle support', value: formatOptionalRole(guild, tickets.ticket_support_role_id), inline: true },
            {
                name: '✨ Expérience',
                value: xpSettings.enabled
                    ? `🟢 Actif · ${xpSettings.cooldown_seconds}s · ${xpRewards.length} récompense(s)`
                    : '⚪ Désactivé',
                inline: true
            },
            { name: '🌍 Fuseau horaire', value: `\`${timezone}\``, inline: true }
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
        new ButtonBuilder().setCustomId('settings:section:xp').setLabel('Expérience').setEmoji('✨').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:section:timezone').setLabel('Fuseau').setEmoji('🌍').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:refresh').setEmoji('🔄').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('settings:close').setEmoji('✖️').setStyle(ButtonStyle.Secondary)
    );

    return { content: '', embeds: [embed], components: [categories, actions] };
}

async function buildSection(section: ConfigSection, guild: Guild) {
    if (section === 'xp') return buildXpHome(guild);
    if (section === 'timezone') return buildTimezoneSection(guild);
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

async function buildTimezoneSection(guild: Guild) {
    const timezone = await getServerTimezone(guild.id);
    const now = new Date();
    const select = new StringSelectMenuBuilder()
        .setCustomId('settings:timezone:common')
        .setPlaceholder('Choisir un fuseau courant')
        .addOptions(COMMON_TIMEZONES.map(value => ({
            label: value,
            value,
            default: value === timezone
        })));
    return {
        content: '',
        embeds: [
            createKeplerEmbed('primary')
                .setTitle('Fuseau horaire du serveur')
                .setDescription(
                    `Fuseau actuel : **${timezone}**\n` +
                    `Heure correspondante : **${formatDateTimeInZone(now, timezone)}**\n\n` +
                    'Ce fuseau est utilisé pour interpréter les dates saisies dans les planifications.'
                )
                .setFooter({ text: guild.name })
        ],
        components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('settings:timezone:custom')
                    .setLabel('Fuseau personnalisé')
                    .setEmoji('✏️')
                    .setStyle(ButtonStyle.Primary),
                backButton()
            )
        ]
    };
}

async function buildXpHome(guild: Guild) {
    const [settings, rewards, boosts] = await Promise.all([
        getXpSettings(guild.id),
        getXpRewards(guild.id),
        getXpRoleBoosts(guild.id)
    ]);
    const embed = createKeplerEmbed(settings.enabled ? 'primary' : 'neutral')
        .setTitle('Expérience et niveaux')
        .setDescription(
            'Configurez la progression du serveur depuis les catégories ci-dessous.\n' +
            'Les boosts de période se multiplient avec le meilleur boost de rôle du membre.'
        )
        .addFields(
            { name: 'État', value: settings.enabled ? '🟢 Actif' : '⚪ Désactivé', inline: true },
            { name: 'Cooldown', value: `${settings.cooldown_seconds} seconde(s)`, inline: true },
            { name: 'Récompenses', value: String(rewards.length), inline: true },
            { name: 'Boosts de rôle', value: String(boosts.length), inline: true },
            {
                name: 'Exclusions',
                value: `${settings.excluded_channel_ids.length} salon(s) · ${settings.excluded_role_ids.length} rôle(s)`,
                inline: true
            },
            { name: 'Boost temporaire', value: formatXpBoostPeriod(settings), inline: false }
        )
        .setFooter({ text: guild.name });
    return {
        content: '',
        embeds: [embed],
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('settings:xp:general').setLabel('Général').setEmoji('⚙️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('settings:xp:boosts').setLabel('Boosts').setEmoji('🚀').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('settings:xp:rewards').setLabel('Récompenses').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('settings:xp:exclusions').setLabel('Exclusions').setEmoji('🚫').setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder<ButtonBuilder>().addComponents(backButton())
        ]
    };
}

async function buildXpGeneral(guild: Guild) {
    const settings = await getXpSettings(guild.id);
    const levelChannelSelect = new ChannelSelectMenuBuilder()
        .setCustomId('settings:xp:level-channel')
        .setPlaceholder('Salon des annonces de niveau')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setMinValues(1)
        .setMaxValues(1);
    if (settings.level_up_channel_id && guild.channels.cache.has(settings.level_up_channel_id)) {
        levelChannelSelect.setDefaultChannels(settings.level_up_channel_id);
    }
    const embed = createKeplerEmbed(settings.enabled ? 'primary' : 'neutral')
        .setTitle('XP · Paramètres généraux')
        .setDescription('Le cooldown s’applique séparément à chaque membre sur ce serveur.')
        .addFields(
            { name: 'Système', value: settings.enabled ? '🟢 Actif' : '⚪ Désactivé', inline: true },
            { name: 'Cooldown', value: `${settings.cooldown_seconds} seconde(s)`, inline: true },
            {
                name: 'Annonce des niveaux',
                value: settings.announce_level_up ? '🟢 Activée' : '⚪ Désactivée',
                inline: true
            },
            {
                name: 'Salon d’annonce',
                value: settings.level_up_channel_id
                    ? formatChannel(guild, settings.level_up_channel_id)
                    : 'Salon où le membre gagne son niveau',
                inline: false
            }
        );
    return {
        content: '',
        embeds: [embed],
        components: [
            new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(levelChannelSelect),
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('settings:xp:toggle')
                    .setLabel(settings.enabled ? 'Désactiver' : 'Activer')
                    .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder().setCustomId('settings:xp:general-edit').setLabel('Modifier').setEmoji('✏️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('settings:xp:clear-level-channel').setLabel('Salon automatique').setStyle(ButtonStyle.Secondary),
                xpBackButton()
            )
        ]
    };
}

async function buildXpBoosts(guild: Guild) {
    const [settings, boosts] = await Promise.all([
        getXpSettings(guild.id),
        getXpRoleBoosts(guild.id)
    ]);
    const boostLines = boosts.map(boost => `<@&${boost.role_id}> · **×${Number(boost.multiplier)}**`);
    const components: ActionRowBuilder<any>[] = [
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('settings:xp:boost-role')
                .setPlaceholder('Ajouter ou modifier un boost de rôle')
                .setMinValues(1)
                .setMaxValues(1)
        )
    ];
    if (boosts.length) {
        components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('settings:xp:remove-boost')
                .setPlaceholder('Supprimer un boost de rôle')
                .addOptions(boosts.slice(0, 25).map(boost => ({
                    label: guild.roles.cache.get(boost.role_id)?.name ?? boost.role_id,
                    description: `Multiplicateur ×${Number(boost.multiplier)}`,
                    value: boost.role_id
                })))
        ));
    }
    components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('settings:xp:boost-period').setLabel('Configurer la période').setEmoji('🗓️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('settings:xp:boost-period-clear').setLabel('Retirer la période').setStyle(ButtonStyle.Secondary),
            xpBackButton()
        )
    );
    return {
        content: '',
        embeds: [
            createKeplerEmbed('accent')
                .setTitle('XP · Boosts')
                .setDescription(
                    `**Période :** ${formatXpBoostPeriod(settings)}\n\n` +
                    `**Boosts de rôle :**\n${boostLines.join('\n') || 'Aucun boost de rôle configuré.'}`
                )
        ],
        components
    };
}

async function buildXpRewards(guild: Guild) {
    const rewards = await getXpRewards(guild.id);
    const components: ActionRowBuilder<any>[] = [
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('settings:xp:reward-role')
                .setPlaceholder('Choisir un rôle de récompense')
                .setMinValues(1)
                .setMaxValues(1)
        )
    ];
    if (rewards.length) {
        components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('settings:xp:remove-reward')
                .setPlaceholder('Supprimer une récompense')
                .addOptions(rewards.slice(0, 25).map(reward => ({
                    label: `Niveau ${reward.level}`,
                    description: guild.roles.cache.get(reward.role_id)?.name ?? reward.role_id,
                    value: String(reward.level)
                })))
        ));
    }
    components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(xpBackButton()));
    return {
        content: '',
        embeds: [
            createKeplerEmbed('primary')
                .setTitle('XP · Récompenses')
                .setDescription(
                    rewards.map(reward => `**Niveau ${reward.level}** · <@&${reward.role_id}>`).join('\n') ||
                    'Aucune récompense configurée. Sélectionnez un rôle puis indiquez son niveau.'
                )
        ],
        components
    };
}

async function buildXpExclusions(guild: Guild) {
    const settings = await getXpSettings(guild.id);
    const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId('settings:xp:excluded-channels')
        .setPlaceholder('Salons privés de gain d’XP')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setMinValues(1)
        .setMaxValues(25);
    const validChannels = settings.excluded_channel_ids.filter(id => guild.channels.cache.has(id)).slice(0, 25);
    if (validChannels.length) channelSelect.setDefaultChannels(...validChannels);

    const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId('settings:xp:excluded-roles')
        .setPlaceholder('Rôles privés de gain d’XP')
        .setMinValues(1)
        .setMaxValues(25);
    const validRoles = settings.excluded_role_ids.filter(id => guild.roles.cache.has(id)).slice(0, 25);
    if (validRoles.length) roleSelect.setDefaultRoles(...validRoles);

    return {
        content: '',
        embeds: [
            createKeplerEmbed('warning')
                .setTitle('XP · Exclusions')
                .setDescription(
                    `**Salons :** ${settings.excluded_channel_ids.map(id => `<#${id}>`).join(', ') || 'Aucun'}\n` +
                    `**Rôles :** ${settings.excluded_role_ids.map(id => `<@&${id}>`).join(', ') || 'Aucun'}`
                )
        ],
        components: [
            new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelSelect),
            new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect),
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('settings:xp:clear-excluded-channels').setLabel('Vider les salons').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('settings:xp:clear-excluded-roles').setLabel('Vider les rôles').setStyle(ButtonStyle.Secondary),
                xpBackButton()
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

async function showTimezoneModal(component: ButtonInteraction, source: ChatInputCommandInteraction) {
    const timezone = await getServerTimezone(source.guildId!);
    const modalId = `settings:timezone:modal:${source.id}`;
    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle('Fuseau horaire personnalisé')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('timezone')
                    .setLabel('Identifiant IANA')
                    .setPlaceholder('America/Martinique')
                    .setStyle(TextInputStyle.Short)
                    .setValue(timezone)
                    .setRequired(true)
            )
        );
    await component.showModal(modal);
    const submission = await awaitSettingsModal(component, source, modalId);
    if (!submission) return;
    const value = submission.fields.getTextInputValue('timezone').trim();
    if (!isValidTimezone(value)) {
        await submission.reply({
            content: '❌ Fuseau invalide. Utilisez un identifiant IANA comme `Europe/Paris` ou `America/Montreal`.',
            ephemeral: true
        });
        return;
    }
    await submission.deferUpdate();
    await updateServerTimezone(source.guildId!, value);
    await submission.editReply(await buildTimezoneSection(source.guild!));
}

async function showXpGeneralModal(component: ButtonInteraction, source: ChatInputCommandInteraction) {
    const settings = await getXpSettings(source.guildId!);
    const modalId = `settings:xp:general-modal:${source.id}`;
    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle('Paramètres généraux XP')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('cooldown')
                    .setLabel('Cooldown en secondes (0 à 86400)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(String(settings.cooldown_seconds))
                    .setRequired(true)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('announce')
                    .setLabel('Annoncer les niveaux ? oui ou non')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.announce_level_up ? 'oui' : 'non')
                    .setRequired(true)
            )
        );
    await component.showModal(modal);
    const submission = await awaitSettingsModal(component, source, modalId);
    if (!submission) return;

    const cooldown = Number(submission.fields.getTextInputValue('cooldown'));
    const announceValue = submission.fields.getTextInputValue('announce').trim().toLowerCase();
    if (!Number.isInteger(cooldown) || cooldown < 0 || cooldown > 86400 || !['oui', 'non'].includes(announceValue)) {
        await submission.reply({
            content: '❌ Utilisez un cooldown entier entre 0 et 86400 et `oui` ou `non` pour les annonces.',
            ephemeral: true
        });
        return;
    }
    await submission.deferUpdate();
    await updateXpSettings(source.guildId!, {
        cooldown_seconds: cooldown,
        announce_level_up: announceValue === 'oui'
    });
    await submission.editReply(await buildXpGeneral(source.guild!));
}

async function showXpBoostPeriodModal(component: ButtonInteraction, source: ChatInputCommandInteraction) {
    const [settings, timezone] = await Promise.all([
        getXpSettings(source.guildId!),
        getServerTimezone(source.guildId!)
    ]);
    const modalId = `settings:xp:period-modal:${source.id}`;
    const start = new TextInputBuilder()
        .setCustomId('start')
        .setLabel('Début (jj/mm/aaaa hh:mm)')
        .setPlaceholder('01/08/2026 18:00')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const end = new TextInputBuilder()
        .setCustomId('end')
        .setLabel('Fin (jj/mm/aaaa hh:mm)')
        .setPlaceholder('03/08/2026 23:59')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    if (settings.boost_starts_at) start.setValue(formatDateTimeInZone(settings.boost_starts_at, timezone));
    if (settings.boost_ends_at) end.setValue(formatDateTimeInZone(settings.boost_ends_at, timezone));
    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle('Période de boost XP')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(start),
            new ActionRowBuilder<TextInputBuilder>().addComponents(end),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('multiplier')
                    .setLabel('Multiplicateur (1.01 à 100)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(String(settings.boost_multiplier))
                    .setRequired(true)
            )
        );
    await component.showModal(modal);
    const submission = await awaitSettingsModal(component, source, modalId);
    if (!submission) return;

    const startValue = submission.fields.getTextInputValue('start').trim();
    const endValue = submission.fields.getTextInputValue('end').trim();
    const startAt = parseDateTimeInZone(startValue, timezone);
    const endAt = parseDateTimeInZone(endValue, timezone);
    const multiplier = Number(submission.fields.getTextInputValue('multiplier').replace(',', '.'));
    if (
        !startAt ||
        !endAt ||
        endAt <= startAt ||
        !Number.isFinite(multiplier) ||
        multiplier <= 1 ||
        multiplier > 100
    ) {
        await submission.reply({
            content: `❌ Utilisez le format \`jj/mm/aaaa hh:mm\` dans le fuseau \`${timezone}\`, avec une fin postérieure au début et un multiplicateur entre 1.01 et 100.`,
            ephemeral: true
        });
        return;
    }
    await submission.deferUpdate();
    await updateXpSettings(source.guildId!, {
        boost_multiplier: multiplier,
        boost_starts_at: startAt.toISOString(),
        boost_ends_at: endAt.toISOString()
    });
    await submission.editReply(await buildXpBoosts(source.guild!));
}

async function showXpRoleBoostModal(
    component: MessageComponentInteraction,
    source: ChatInputCommandInteraction,
    roleId: string
) {
    const role = source.guild!.roles.cache.get(roleId);
    if (!role || role.id === source.guild!.roles.everyone.id) {
        await component.reply({ content: KEPLER_MESSAGES.invalidRole, ephemeral: true });
        return;
    }
    const existing = (await getXpRoleBoosts(source.guildId!)).find(boost => boost.role_id === roleId);
    const modalId = `settings:xp:role-boost-modal:${roleId}:${source.id}`;
    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle('Boost XP du rôle')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('multiplier')
                    .setLabel('Multiplicateur (1.01 à 100)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(String(existing?.multiplier ?? 1.5))
                    .setRequired(true)
            )
        );
    await component.showModal(modal);
    const submission = await awaitSettingsModal(component, source, modalId);
    if (!submission) return;
    const multiplier = Number(submission.fields.getTextInputValue('multiplier').replace(',', '.'));
    if (!Number.isFinite(multiplier) || multiplier <= 1 || multiplier > 100) {
        await submission.reply({ content: '❌ Le multiplicateur doit être compris entre 1.01 et 100.', ephemeral: true });
        return;
    }
    await submission.deferUpdate();
    await setXpRoleBoost(source.guildId!, roleId, multiplier);
    await submission.editReply(await buildXpBoosts(source.guild!));
}

async function showXpRewardModal(
    component: MessageComponentInteraction,
    source: ChatInputCommandInteraction,
    roleId: string
) {
    const existing = (await getXpRewards(source.guildId!)).find(reward => reward.role_id === roleId);
    const modalId = `settings:xp:reward-modal:${roleId}:${source.id}`;
    const modal = new ModalBuilder()
        .setCustomId(modalId)
        .setTitle('Récompense de niveau')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('level')
                    .setLabel('Niveau requis (1 à 1000)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(String(existing?.level ?? 1))
                    .setRequired(true)
            )
        );
    await component.showModal(modal);
    const submission = await awaitSettingsModal(component, source, modalId);
    if (!submission) return;
    const level = Number(submission.fields.getTextInputValue('level'));
    if (!Number.isInteger(level) || level < 1 || level > 1000) {
        await submission.reply({ content: '❌ Le niveau doit être un entier entre 1 et 1000.', ephemeral: true });
        return;
    }
    await submission.deferUpdate();
    if (existing && existing.level !== level) await deleteXpReward(source.guildId!, existing.level);
    await setXpReward(source.guildId!, level, roleId);
    await submission.editReply(await buildXpRewards(source.guild!));
}

async function awaitSettingsModal(
    component: MessageComponentInteraction,
    source: ChatInputCommandInteraction,
    modalId: string
) {
    try {
        return await component.awaitModalSubmit({
            filter: modal => modal.user.id === source.user.id && modal.customId === modalId,
            time: PANEL_TIMEOUT
        });
    } catch (error: any) {
        if (error?.code !== 'InteractionCollectorError') throw error;
        return null;
    }
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
        tickets: 'Tickets',
        xp: 'Expérience et niveaux',
        timezone: 'Fuseau horaire'
    })[section];
}

function sectionDescription(section: ConfigSection): string {
    return ({
        logs: 'Choisissez le salon qui recevra les événements généraux du serveur.',
        moderation: 'Choisissez le salon qui recevra les sanctions et actions de modération.',
        birthdays: 'Choisissez le salon dans lequel les anniversaires seront annoncés.',
        mute: 'Sélectionnez un rôle existant, créez-en un automatiquement ou utilisez les timeouts Discord.',
        reports: 'Choisissez le salon qui recevra les signalements et, si nécessaire, le rôle de modération à mentionner.',
        tickets: 'Choisissez où publier le panneau, le rôle support, puis personnalisez son message et son bouton.',
        xp: 'Configurez la progression, les boosts, les récompenses et les exclusions du serveur.',
        timezone: 'Choisissez le fuseau utilisé pour les dates et planifications du serveur.'
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

function xpBackButton(): ButtonBuilder {
    return new ButtonBuilder().setCustomId('settings:xp:home').setLabel('Retour XP').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
}

function formatXpBoostPeriod(settings: Awaited<ReturnType<typeof getXpSettings>>): string {
    if (!settings.boost_starts_at || !settings.boost_ends_at || Number(settings.boost_multiplier) <= 1) {
        return '⚪ Aucune';
    }
    const start = Math.floor(new Date(settings.boost_starts_at).getTime() / 1000);
    const end = Math.floor(new Date(settings.boost_ends_at).getTime() / 1000);
    const active = Date.now() >= start * 1000 && Date.now() <= end * 1000;
    return `${active ? '🟢' : '🗓️'} ×${Number(settings.boost_multiplier)} · <t:${start}:f> → <t:${end}:f>`;
}
