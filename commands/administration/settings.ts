import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    type ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    RoleSelectMenuBuilder,
    SlashCommandBuilder,
    type Guild,
    type MessageComponentInteraction
} from 'discord.js';
import {
    getBirthdayChannel,
    getLogChannel,
    getModerationChannel,
    getMuteRole,
    updateBirthdayChannel,
    updateLogChannel,
    updateModerationChannel,
    updateMuteRole
} from '../../database/db.ts';
import { logger } from '../../utils/logger.ts';

type ConfigSection = 'logs' | 'moderation' | 'birthdays' | 'mute';

const PANEL_COLOR = 0x45d7ff;
const PANEL_TIMEOUT = 5 * 60 * 1000;

export const data = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Ouvre le panneau de configuration du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
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

        try {
            await handleComponent(component, interaction);
        } catch (error) {
            logger.error('Erreur dans le panneau de configuration', error, 'SettingsPanel');
            const payload = { content: 'Une erreur est survenue pendant la mise à jour.', components: [] };
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
            await component.update(buildSection(section, guild));
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
            await component.editReply(await buildOverview(source, `${sectionLabel(section)} désactivé.`));
            return;
        }
        if (component.customId === 'settings:create-mute') {
            await component.update(buildMuteCreationConfirmation());
            return;
        }
        if (component.customId === 'settings:confirm-create-mute') {
            await component.deferUpdate();
            const result = await createMuteRole(guild, source.user.tag);
            await component.editReply(await buildOverview(
                source,
                `Rôle ${result.role} créé. Permissions appliquées dans ${result.success}/${result.total} salons.`
            ));
        }
        return;
    }

    if (component.isChannelSelectMenu()) {
        const section = component.customId.split(':')[2] as ConfigSection;
        const channelId = component.values[0];
        await component.deferUpdate();
        await updateChannelSection(section, guild.id, channelId);
        await component.editReply(await buildOverview(source, `${sectionLabel(section)} configuré sur <#${channelId}>.`));
        return;
    }

    if (component.isRoleSelectMenu()) {
        const roleId = component.values[0];
        const role = guild.roles.cache.get(roleId) ?? await guild.roles.fetch(roleId);
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
        await component.editReply(await buildOverview(source, `Rôle de mute configuré sur ${role}.`));
    }
}

async function buildOverview(interaction: ChatInputCommandInteraction, notice?: string) {
    const guild = interaction.guild!;
    const [logs, moderation, birthdays, mute] = await Promise.all([
        getLogChannel(guild.id),
        getModerationChannel(guild.id),
        getBirthdayChannel(guild.id),
        getMuteRole(guild.id)
    ]);

    const embed = new EmbedBuilder()
        .setColor(PANEL_COLOR)
        .setAuthor({
            name: `${interaction.client.user.username} // Configuration`,
            iconURL: interaction.client.user.displayAvatarURL({ forceStatic: true })
        })
        .setTitle(`Configuration de ${guild.name}`)
        .setDescription(notice ? `✅ ${notice}` : 'Sélectionnez une catégorie pour modifier sa configuration.')
        .addFields(
            { name: '📑 Journaux serveur', value: formatChannel(guild, logs), inline: true },
            { name: '🛡️ Modération', value: formatChannel(guild, moderation), inline: true },
            { name: '🎂 Anniversaires', value: formatChannel(guild, birthdays), inline: true },
            { name: '🔇 Rôle de mute', value: formatRole(guild, mute), inline: true }
        )
        .setFooter({ text: 'Panneau privé • expiration dans 5 minutes' })
        .setTimestamp();

    const categories = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('settings:section:logs').setLabel('Journaux').setEmoji('📑').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:section:moderation').setLabel('Modération').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:section:birthdays').setLabel('Anniversaires').setEmoji('🎂').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('settings:section:mute').setLabel('Mute').setEmoji('🔇').setStyle(ButtonStyle.Secondary)
    );
    const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('settings:refresh').setEmoji('🔄').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('settings:close').setEmoji('✖️').setStyle(ButtonStyle.Secondary)
    );

    return { content: '', embeds: [embed], components: [categories, actions] };
}

function buildSection(section: ConfigSection, guild: Guild) {
    const embed = new EmbedBuilder()
        .setColor(PANEL_COLOR)
        .setTitle(sectionLabel(section))
        .setDescription(sectionDescription(section))
        .setFooter({ text: guild.name });

    if (section === 'mute') {
        const select = new RoleSelectMenuBuilder()
            .setCustomId('settings:select:mute')
            .setPlaceholder('Choisir un rôle existant')
            .setMinValues(1)
            .setMaxValues(1);
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

    const select = new ChannelSelectMenuBuilder()
        .setCustomId(`settings:select:${section}`)
        .setPlaceholder('Choisir un salon textuel')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setMinValues(1)
        .setMaxValues(1);
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
    const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('Confirmer la désactivation')
        .setDescription(`La configuration « ${sectionLabel(section)} » sera supprimée.`);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`settings:confirm-disable:${section}`).setLabel('Confirmer').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`settings:section:${section}`).setLabel('Annuler').setStyle(ButtonStyle.Secondary)
    );
    return { content: '', embeds: [embed], components: [row] };
}

function buildMuteCreationConfirmation() {
    const embed = new EmbedBuilder()
        .setColor(0xf8c15c)
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
    else await updateMuteRole(guildId, '');
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
        logs: 'Journaux serveur',
        moderation: 'Journaux de modération',
        birthdays: 'Annonces d’anniversaire',
        mute: 'Rôle de mute'
    })[section];
}

function sectionDescription(section: ConfigSection): string {
    return ({
        logs: 'Choisissez le salon qui recevra les événements généraux du serveur.',
        moderation: 'Choisissez le salon qui recevra les sanctions et actions de modération.',
        birthdays: 'Choisissez le salon dans lequel les anniversaires seront annoncés.',
        mute: 'Sélectionnez un rôle existant, créez-en un automatiquement ou utilisez les timeouts Discord.'
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

function backButton(): ButtonBuilder {
    return new ButtonBuilder().setCustomId('settings:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
}
