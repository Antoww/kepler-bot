import { createKeplerEmbed, KEPLER_CHART_COLORS, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import {
    type ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    SlashCommandBuilder,
    AttachmentBuilder,
    PermissionFlagsBits
} from 'discord.js';
import {
    getDailyStats,
    getTopCommands,
    getTopUsers,
    getTopChannels,
    getTotalStats
} from '../../utils/statsTracker.ts';
import { renderBarChart, renderLineChart } from '../../utils/statsChart.ts';

type ServerStatsAction = 'overview' | 'activity' | 'members' | 'channels' | 'users' | 'commands';
const PANEL_TIMEOUT = 5 * 60 * 1000;

export const data = new SlashCommandBuilder()
    .setName('graph')
    .setDescription('Ouvre le panneau des statistiques du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return void await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return void await interaction.reply({ content: KEPLER_MESSAGES.administratorOnly, ephemeral: true });
    }
    const response = await interaction.reply({ ...serverHome(interaction), ephemeral: true, fetchReply: true });
    const collector = response.createMessageComponentCollector({ time: PANEL_TIMEOUT });
    collector.on('collect', async component => {
        if (component.user.id !== interaction.user.id) return void await component.reply({ content: KEPLER_MESSAGES.unauthorizedComponent, ephemeral: true });
        try {
            if (component.isButton()) {
                if (component.customId === 'graph:home') return void await component.update(serverHome(interaction));
                if (component.customId === 'graph:close') return void await component.update({ content: 'Panneau fermé.', embeds: [], components: [], attachments: [] });
                if (component.customId.startsWith('graph:action:')) {
                    const action = component.customId.split(':')[2] as ServerStatsAction;
                    return action === 'members'
                        ? void await runServerAction(interaction, component, action, 30)
                        : void await component.update(periodPicker(action));
                }
            }
            if (component.isStringSelectMenu() && component.customId.startsWith('graph:period:')) {
                const action = component.customId.split(':')[2] as ServerStatsAction;
                const period = component.values[0];
                if (action === 'channels' || action === 'users') {
                    await component.update(limitPicker(action, period));
                } else {
                    await runServerAction(interaction, component, action, period === 'all' ? null : Number(period));
                }
                return;
            }
            if (component.isStringSelectMenu() && component.customId.startsWith('graph:limit:')) {
                const [, , actionValue, period] = component.customId.split(':');
                await runServerAction(
                    interaction,
                    component,
                    actionValue as ServerStatsAction,
                    period === 'all' ? null : Number(period),
                    Number(component.values[0])
                );
            }
        } catch (error) {
            console.error('[Graph Panel] Erreur:', error);
            const payload = { content: KEPLER_MESSAGES.unexpectedError, embeds: [], components: [] };
            if (component.deferred || component.replied) await component.editReply(payload);
            else await component.reply({ content: payload.content, ephemeral: true });
        }
    });
    collector.on('end', async () => { try { await interaction.editReply({ components: [] }); } catch { /* fermé */ } });
}

function serverHome(interaction: ChatInputCommandInteraction) {
    const embed = createKeplerEmbed('primary').setTitle(`📊 Statistiques de ${interaction.guild!.name}`)
        .setDescription('Choisissez une vue, puis la période à analyser.').setThumbnail(interaction.guild!.iconURL({ forceStatic: true }))
        .setFooter({ text: 'Panneau privé • expiration dans 5 minutes' });
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(serverButton('overview', 'Vue d’ensemble', '📊'), serverButton('activity', 'Activité', '📈'), serverButton('members', 'Membres', '👥'));
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(serverButton('channels', 'Canaux', '📺'), serverButton('users', 'Utilisateurs', '👑'), serverButton('commands', 'Commandes', '⚡'));
    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('graph:home').setEmoji('🔄').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('graph:close').setEmoji('✖️').setStyle(ButtonStyle.Secondary));
    return { content: '', embeds: [embed], components: [row1, row2, controls], attachments: [] };
}

function serverButton(action: ServerStatsAction, label: string, emoji: string) {
    return new ButtonBuilder().setCustomId(`graph:action:${action}`).setLabel(label).setEmoji(emoji).setStyle(ButtonStyle.Secondary);
}

function periodPicker(action: ServerStatsAction) {
    const select = new StringSelectMenuBuilder().setCustomId(`graph:period:${action}`).setPlaceholder('Choisir la période').addOptions(
        { label: '7 jours', value: '7' }, { label: '30 jours', value: '30' }, { label: '90 jours', value: '90' },
        { label: '180 jours', value: '180' }, { label: '360 jours', value: '360' }, { label: 'Depuis toujours', value: 'all' }
    );
    return { content: '', embeds: [createKeplerEmbed('primary').setTitle('📅 Période analysée').setDescription('Sélectionnez la période du graphique.')], attachments: [], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), new ActionRowBuilder<ButtonBuilder>().addComponents(serverBackButton())] };
}

function limitPicker(action: 'channels' | 'users', period: string) {
    const options = [5, 10, 15, ...(action === 'users' ? [20] : [])]
        .map(value => ({ label: `Top ${value}`, value: String(value) }));
    const select = new StringSelectMenuBuilder()
        .setCustomId(`graph:limit:${action}:${period}`)
        .setPlaceholder('Choisir la taille du classement')
        .addOptions(options);
    return {
        content: '',
        embeds: [createKeplerEmbed('primary').setTitle('🏆 Taille du classement').setDescription('Choisissez le nombre d’éléments à afficher.')],
        attachments: [],
        components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
            new ActionRowBuilder<ButtonBuilder>().addComponents(serverBackButton())
        ]
    };
}

async function runServerAction(source: ChatInputCommandInteraction, component: any, action: ServerStatsAction, days: number | null, limit = 10) {
    await component.deferUpdate();
    await component.editReply({ content: '', attachments: [], components: [], embeds: [createKeplerEmbed('neutral').setTitle('Génération du graphique').setDescription('⏳ Préparation des statistiques…')] });
    const interaction = statsAdapter(source, component, days, limit);
    if (action === 'overview') await handleOverview(interaction); else if (action === 'activity') await handleActivity(interaction);
    else if (action === 'members') await handleMembers(interaction); else if (action === 'channels') await handleChannels(interaction);
    else if (action === 'users') await handleUsers(interaction); else await handleCommands(interaction);
}

function statsAdapter(source: ChatInputCommandInteraction, component: any, days: number | null, limit: number): ChatInputCommandInteraction {
    return { guild: source.guild, guildId: source.guildId, user: source.user, client: source.client,
        options: { getBoolean: (name: string) => name === 'depuis_toujours' ? days === null : null, getInteger: (name: string) => name === 'jours' ? days : name === 'limite' ? limit : null },
        editReply: (payload: any) => component.editReply(serverResult(payload)) } as unknown as ChatInputCommandInteraction;
}

function serverResult(payload: any) {
    const value = typeof payload === 'string' ? { content: payload } : payload;
    return { content: value.content ?? '', embeds: value.embeds ?? [], files: value.files ?? [], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(serverBackButton())] };
}

function serverBackButton() { return new ButtonBuilder().setCustomId('graph:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary); }

// ============================================
// Handlers pour les sous-commandes
// ============================================

async function handleOverview(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const guildId = interaction.guildId!;

    const [dailyStats, totalStats, topCommands] = await Promise.all([
        getDailyStats(days, guildId),
        getTotalStats(guildId),
        getTopCommands(days, 5, guildId)
    ]);

    // Stats de la période
    const periodCommands = dailyStats.reduce((sum, d) => sum + d.commands, 0);
    const periodMessages = dailyStats.reduce((sum, d) => sum + d.messages, 0);


    const overviewBuffer = await renderLineChart(
        `Activité de ${interaction.guild!.name}`,
        periodLabel,
        dailyStats.map(d => formatChartDate(d.date)),
        [
            { label: 'Messages', color: KEPLER_CHART_COLORS.messages, values: dailyStats.map(d => d.messages) },
            { label: 'Commandes', color: KEPLER_CHART_COLORS.commands, values: dailyStats.map(d => d.commands) }
        ]
    );
    const overviewAttachment = new AttachmentBuilder(overviewBuffer, { name: 'server-overview.webp' });

    // Top commandes
    const topCmdList = topCommands
        .map((c, i) => `${i + 1}. \`/${c.command_name}\` (${c.count.toLocaleString()})`)
        .join('\n') || 'Aucune commande utilisée';

    // Stats du serveur
    const guild = interaction.guild!;
    const memberStats = [
        `**Total:** ${guild.memberCount.toLocaleString()} membres`,
        `**Humains:** ${guild.members.cache.filter(m => !m.user.bot).size.toLocaleString()}`,
        `**Bots:** ${guild.members.cache.filter(m => m.user.bot).size.toLocaleString()}`
    ].join('\n');

    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.primary)
        .setTitle(`📊 Vue d'ensemble - ${guild.name}`)
        .setThumbnail(guild.iconURL() || null)
        .setDescription(`Statistiques sur **${periodLabel}**`)
        .addFields(
            {
                name: '👥 Membres',
                value: memberStats,
                inline: true
            },
            {
                name: `📨 Activité (${periodLabel})`,
                value: [
                    `**Messages:** ${periodMessages.toLocaleString()}`,
                    `**Commandes:** ${periodCommands.toLocaleString()}`,
                    `**Moy/jour:** ${Math.round(periodMessages / Math.max(dailyStats.length, 1))}`
                ].join('\n'),
                inline: true
            },
            {
                name: '📈 Total historique',
                value: [
                    `**Messages:** ${totalStats.totalMessages.toLocaleString()}`,
                    `**Commandes:** ${totalStats.totalCommands.toLocaleString()}`,
                    `**Jours trackés:** ${totalStats.totalDays}`
                ].join('\n'),
                inline: true
            },
            {
                name: '🏆 Top 5 commandes',
                value: topCmdList,
                inline: false
            }
        )
        .setImage('attachment://server-overview.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [overviewAttachment] });
}

async function handleActivity(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const guildId = interaction.guildId!;

    const dailyStats = await getDailyStats(days, guildId);

    // Calculer les stats
    const totalMessages = dailyStats.reduce((sum, d) => sum + d.messages, 0);
    const totalCommands = dailyStats.reduce((sum, d) => sum + d.commands, 0);
    const avgMessages = Math.round(totalMessages / Math.max(dailyStats.length, 1));
    const avgCommands = Math.round(totalCommands / Math.max(dailyStats.length, 1));

    // Jour le plus actif
    const maxDay = dailyStats.length > 0
        ? dailyStats.reduce((max, d) => d.messages > max.messages ? d : max)
        : null;

    const activityBuffer = await renderLineChart(
        'Activité du serveur',
        periodLabel,
        dailyStats.map(d => formatChartDate(d.date)),
        [
            { label: 'Messages', color: KEPLER_CHART_COLORS.messages, values: dailyStats.map(d => d.messages) },
            { label: 'Commandes', color: KEPLER_CHART_COLORS.commands, values: dailyStats.map(d => d.commands) }
        ]
    );
    const activityAttachment = new AttachmentBuilder(activityBuffer, { name: 'server-activity.webp' });


    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.primary)
        .setTitle(`📈 Activité du serveur`)
        .setDescription(`Période: **${periodLabel}**`)
        .addFields(
            {
                name: '💬 Messages',
                value: [
                    `**Total:** ${totalMessages.toLocaleString()}`,
                    `**Moyenne/jour:** ${avgMessages.toLocaleString()}`,
                    `**Record:** ${maxDay ? `${maxDay.messages} (${new Date(maxDay.date).toLocaleDateString('fr-FR')})` : 'N/A'}`
                ].join('\n'),
                inline: true
            },
            {
                name: '⚡ Commandes',
                value: [
                    `**Total:** ${totalCommands.toLocaleString()}`,
                    `**Moyenne/jour:** ${avgCommands.toLocaleString()}`
                ].join('\n'),
                inline: true
            },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: '📊 Tendance des messages',
                value: 'Graphique détaillé ci-dessous.',
                inline: false
            }
        )
        .setImage('attachment://server-activity.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [activityAttachment] });
}

async function handleMembers(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;

    // Statistiques des membres
    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = totalMembers - bots;

    // Rôles
    const roles = guild.roles.cache.filter(r => r.id !== guild.id).size;
    const topRole = guild.roles.highest;

    // Boosts
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const membersBuffer = await renderBarChart(
        'Composition des membres',
        guild.name,
        [
            { label: 'Humains', value: humans },
            { label: 'Bots', value: bots },
            { label: 'En ligne', value: onlineMembers }
        ],
        KEPLER_CHART_COLORS.members
    );
    const membersAttachment = new AttachmentBuilder(membersBuffer, { name: 'server-members.webp' });


    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.accent)
        .setTitle(`👥 Statistiques des membres`)
        .setThumbnail(guild.iconURL() || null)
        .addFields(
            {
                name: '📊 Composition',
                value: [
                    `**Total:** ${totalMembers.toLocaleString()} membres`,
                    `**Humains:** ${humans.toLocaleString()}`,
                    `**Bots:** ${bots.toLocaleString()}`,
                    `**En ligne:** ${onlineMembers.toLocaleString()}`
                ].join('\n'),
                inline: true
            },
            {
                name: '🎭 Rôles',
                value: [
                    `**Total:** ${roles} rôles`,
                    `**Plus haut:** ${topRole.name}`
                ].join('\n'),
                inline: true
            },
            {
                name: '💎 Boosts',
                value: [
                    `**Niveau:** ${boostLevel}`,
                    `**Boosts:** ${boostCount}`
                ].join('\n'),
                inline: true
            },
            {
                name: '📅 Informations',
                value: [
                    `**Créé le:** ${guild.createdAt.toLocaleDateString('fr-FR')}`,
                    `**Propriétaire:** <@${guild.ownerId}>`,
                    `**Canaux:** ${guild.channels.cache.size}`
                ].join('\n'),
                inline: false
            }
        )
        .setImage('attachment://server-members.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [membersAttachment] });
}

async function handleChannels(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const limit = interaction.options.getInteger('limite') || 10;
    const guildId = interaction.guildId!;

    const topChannels = await getTopChannels(days, limit, guildId);

    if (topChannels.length === 0) {
        return interaction.editReply(KEPLER_MESSAGES.noData);
    }

    // Résoudre les noms de canaux et créer le graphique
    const chartData: { label: string; value: number }[] = [];

    for (const channelStat of topChannels) {
        const channel = interaction.guild!.channels.cache.get(channelStat.channel_id);
        const name = channel ? `#${channel.name}` : 'Canal supprimé';
        chartData.push({
            label: name.slice(0, 15),
            value: channelStat.message_count
        });
    }

    const channelsBuffer = await renderBarChart('Canaux les plus actifs', periodLabel, chartData, KEPLER_CHART_COLORS.channels);
    const channelsAttachment = new AttachmentBuilder(channelsBuffer, { name: 'server-channels.webp' });

    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.danger)
        .setTitle('📺 Canaux les plus actifs')
        .setDescription(`Période: **${periodLabel}**`)
        .addFields({
            name: '📊 Classement',
            value: 'Graphique détaillé ci-dessous.',
            inline: false
        })
        .setImage('attachment://server-channels.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [channelsAttachment] });
}

async function handleUsers(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const limit = interaction.options.getInteger('limite') || 10;
    const guildId = interaction.guildId!;

    const topUsers = await getTopUsers(days, limit, guildId);

    if (topUsers.length === 0) {
        return interaction.editReply(KEPLER_MESSAGES.noData);
    }

    // Résoudre les membres manquants en parallèle pour limiter la latence Discord.
    const resolvedUsers = await Promise.all(topUsers.map(async user => {
        const cachedMember = interaction.guild!.members.cache.get(user.user_id);
        if (cachedMember) return { ...user, username: cachedMember.displayName };
        try {
            const member = await interaction.guild!.members.fetch(user.user_id);
            return { ...user, username: member.displayName };
        } catch {
            return { ...user, username: 'Utilisateur parti' };
        }
    }));

    const userLines = resolvedUsers.map((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        return `${medal} **${user.username}** - ${user.message_count.toLocaleString()} messages`;
    });
    const chartData = resolvedUsers.map(user => ({
        label: user.username.slice(0, 24),
        value: user.message_count
    }));

    const usersBuffer = await renderBarChart('Utilisateurs les plus actifs', periodLabel, chartData, KEPLER_CHART_COLORS.users);
    const usersAttachment = new AttachmentBuilder(usersBuffer, { name: 'server-users.webp' });

    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.highlight)
        .setTitle('👑 Utilisateurs les plus actifs')
        .setDescription(`Période: **${periodLabel}**\n\n${userLines.join('\n')}`)
        .setImage('attachment://server-users.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [usersAttachment] });
}

async function handleCommands(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const guildId = interaction.guildId!;

    const [topCommands, dailyStats] = await Promise.all([
        getTopCommands(days, 10, guildId),
        getDailyStats(days, guildId)
    ]);

    if (topCommands.length === 0) {
        return interaction.editReply('📊 Aucune commande utilisée durant cette période.');
    }

    // Calculer les stats
    const totalCommands = dailyStats.reduce((sum, d) => sum + d.commands, 0);
    const avgPerDay = Math.round(totalCommands / Math.max(dailyStats.length, 1));

    // Graphique
    const chartData = topCommands.map(c => ({
        label: `/${c.command_name}`,
        value: c.count
    }));
    const commandsBuffer = await renderBarChart('Commandes les plus utilisées', periodLabel, chartData, KEPLER_CHART_COLORS.commands);
    const commandsAttachment = new AttachmentBuilder(commandsBuffer, { name: 'server-commands.webp' });


    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.warning)
        .setTitle('⚡ Commandes les plus utilisées')
        .setDescription(`Période: **${periodLabel}**`)
        .addFields(
            {
                name: '📊 Résumé',
                value: [
                    `**Total:** ${totalCommands.toLocaleString()} commandes`,
                    `**Moyenne/jour:** ${avgPerDay.toLocaleString()}`
                ].join('\n'),
                inline: false
            },
            {
                name: '🏆 Top 10',
                value: 'Graphique détaillé ci-dessous.',
                inline: false
            }
        )
        .setImage('attachment://server-commands.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [commandsAttachment] });
}

function formatChartDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function resolveStatsDays(interaction: ChatInputCommandInteraction, fallback: number): number | null {
    return interaction.options.getBoolean('depuis_toujours')
        ? null
        : interaction.options.getInteger('jours') || fallback;
}

function formatStatsPeriod(days: number | null): string {
    return days === null ? 'Depuis toujours' : `${days} derniers jours`;
}
