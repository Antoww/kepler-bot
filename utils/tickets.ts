import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    type ButtonInteraction,
    type Guild,
    type Message,
    type OverwriteResolvable,
    PermissionFlagsBits,
    type TextChannel
} from 'discord.js';
import { Buffer } from 'node:buffer';
import { getTicketConfig } from '../database/db.ts';
import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from './theme.ts';
import { logger } from './logger.ts';

const TICKET_TOPIC_PREFIX = 'kepler-ticket:';
const openingTickets = new Set<string>();

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }

    if (interaction.customId === 'ticket:open') {
        await openTicket(interaction);
        return;
    }
    if (interaction.customId === 'ticket:close') {
        await requestTicketClose(interaction);
        return;
    }
    if (interaction.customId === 'ticket:reopen') {
        await reopenTicket(interaction);
        return;
    }
    if (interaction.customId === 'ticket:archive') {
        await archiveTicket(interaction);
        return;
    }
    if (interaction.customId.startsWith('ticket:confirm-user-close:')) {
        await removeTicketOwner(interaction);
        return;
    }
    if (interaction.customId.startsWith('ticket:confirm-delete:')) {
        await deleteTicket(interaction);
    }
}

async function openTicket(interaction: ButtonInteraction): Promise<void> {
    const lockKey = `${interaction.guildId}:${interaction.user.id}`;
    if (openingTickets.has(lockKey)) {
        await interaction.reply({ content: '⏳ Votre ticket est déjà en cours de création.', ephemeral: true });
        return;
    }
    openingTickets.add(lockKey);

    try {
        await interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild!;
        const config = await getTicketConfig(guild.id);
        if (!config.ticket_panel_channel_id || interaction.channelId !== config.ticket_panel_channel_id) {
            await interaction.editReply('❌ Ce panneau de tickets n’est plus actif.');
            return;
        }

        await guild.channels.fetch();
        const topic = `${TICKET_TOPIC_PREFIX}${interaction.user.id}`;
        const existing = guild.channels.cache.find(channel =>
            channel.type === ChannelType.GuildText && channel.topic?.startsWith(topic)
        );
        if (existing) {
            await interaction.editReply(`Vous avez déjà un ticket ouvert : ${existing}`);
            return;
        }

        const panelChannel = guild.channels.cache.get(config.ticket_panel_channel_id);
        const configuredCategory = config.ticket_category_id
            ? guild.channels.cache.get(config.ticket_category_id)
            : null;
        const botMember = guild.members.me;
        if (!botMember) {
            await interaction.editReply('❌ Impossible de vérifier les permissions du bot.');
            return;
        }

        const permissionOverwrites: OverwriteResolvable[] = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                ]
            },
            {
                id: botMember.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels
                ]
            }
        ];
        const supportRole = config.ticket_support_role_id
            ? await guild.roles.fetch(config.ticket_support_role_id).catch(() => null)
            : null;
        if (supportRole) {
            permissionOverwrites.push({
                id: supportRole.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                ]
            });
        }

        const channel = await guild.channels.create({
            name: ticketChannelName(interaction.user.username, interaction.user.id),
            type: ChannelType.GuildText,
            parent: configuredCategory?.type === ChannelType.GuildCategory
                ? configuredCategory.id
                : panelChannel?.parentId ?? undefined,
            topic,
            permissionOverwrites,
            reason: `Ticket ouvert par ${interaction.user.tag}`
        });

        const welcome = createKeplerEmbed()
            .setColor(KEPLER_COLORS.primary)
            .setTitle('🎫 Ticket ouvert')
            .setDescription(
                `${interaction.user}, décrivez votre demande avec le plus de détails possible.\n\n` +
                'Un membre de l’équipe vous répondra dès que possible.'
            )
            .setFooter({ text: `Ticket de ${interaction.user.tag}` });
        const supportMention = supportRole
            ? `${supportRole} `
            : '';
        await channel.send({
            content: `${supportMention}${interaction.user}`,
            embeds: [welcome],
            components: [ticketControlRow(false)],
            allowedMentions: {
                users: [interaction.user.id],
                roles: supportRole ? [supportRole.id] : []
            }
        });
        await sendTicketLog(guild, {
            title: '🟢 Ticket ouvert',
            description: `${interaction.user} a ouvert ${channel}.`,
            color: KEPLER_COLORS.success
        });
        await interaction.editReply(`✅ Votre ticket a été créé : ${channel}`);
    } catch (error) {
        logger.error('Erreur lors de la création du ticket', error, 'Tickets');
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply('❌ Impossible de créer votre ticket. Vérifiez les permissions du bot.');
        }
    } finally {
        openingTickets.delete(lockKey);
    }
}

async function requestTicketClose(interaction: ButtonInteraction): Promise<void> {
    const ownerId = getTicketOwnerId(interaction);
    if (!ownerId) {
        await interaction.reply({ content: '❌ Vous ne pouvez pas fermer ce ticket.', ephemeral: true });
        return;
    }

    const isOwner = interaction.user.id === ownerId;
    const isStaff = await isTicketStaff(interaction);
    if (!isOwner && !isStaff) {
        await interaction.reply({ content: '❌ Vous ne pouvez pas fermer ce ticket.', ephemeral: true });
        return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            // Les droits d'équipe sont prioritaires sur le statut de propriétaire :
            // un gestionnaire qui a ouvert le ticket peut donc le supprimer.
            .setCustomId(isStaff
                ? `ticket:confirm-delete:${ownerId}`
                : `ticket:confirm-user-close:${ownerId}`)
            .setLabel(isStaff ? 'Clôturer définitivement' : 'Confirmer et quitter')
            .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
        content: isStaff
            ? 'Cette action supprimera définitivement le salon du ticket. Confirmer ?'
            : 'Vous perdrez l’accès au ticket. L’équipe pourra ensuite le clôturer définitivement. Confirmer ?',
        components: [row],
        ephemeral: true
    });
}

async function removeTicketOwner(interaction: ButtonInteraction): Promise<void> {
    const ownerId = getTicketOwnerId(interaction);
    const expectedOwnerId = interaction.customId.split(':')[2];
    if (!ownerId || ownerId !== expectedOwnerId || interaction.user.id !== ownerId) {
        await interaction.reply({ content: '❌ Confirmation de fermeture invalide.', ephemeral: true });
        return;
    }

    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) return;
    await interaction.deferReply({ ephemeral: true });
    await channel.permissionOverwrites.edit(ownerId, {
        ViewChannel: false,
        SendMessages: false
    }, { reason: `Ticket quitté par ${interaction.user.tag}` });
    if (!channel.topic?.endsWith(':closed')) {
        await channel.setTopic(`${TICKET_TOPIC_PREFIX}${ownerId}:closed`, `Ticket quitté par ${interaction.user.tag}`);
    }
    await channel.send({
        embeds: [
            createKeplerEmbed()
                .setColor(KEPLER_COLORS.warning)
                .setTitle('🔒 Ticket fermé par l’utilisateur')
                .setDescription(`<@${ownerId}> a quitté le ticket. L’équipe peut maintenant le clôturer définitivement.`)
        ],
        components: [ticketControlRow(true)],
        allowedMentions: { parse: [] }
    });
    await sendTicketLog(interaction.guild!, {
        title: '🟠 Ticket fermé par son créateur',
        description: `<@${ownerId}> a quitté ${channel}. Le ticket reste accessible à l’équipe.`,
        color: KEPLER_COLORS.warning
    });
    await interaction.editReply('✅ Vous avez été retiré du ticket.');
}

async function deleteTicket(interaction: ButtonInteraction): Promise<void> {
    const ownerId = getTicketOwnerId(interaction);
    const expectedOwnerId = interaction.customId.split(':')[2];
    if (!ownerId || ownerId !== expectedOwnerId || !(await isTicketStaff(interaction))) {
        await interaction.reply({ content: '❌ Confirmation de clôture invalide.', ephemeral: true });
        return;
    }

    await interaction.reply({ content: '🗑️ Clôture définitive du ticket…', ephemeral: true });
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) return;
    await sendTicketLog(interaction.guild!, {
        title: '🔴 Ticket clôturé définitivement',
        description: `${channel.name} a été supprimé par ${interaction.user}. Créateur : <@${ownerId}>.`,
        color: KEPLER_COLORS.danger
    });
    await channel.delete(`Ticket clôturé par ${interaction.user.tag}`);
}

async function reopenTicket(interaction: ButtonInteraction): Promise<void> {
    const ownerId = getTicketOwnerId(interaction);
    const channel = interaction.channel;
    if (!ownerId || !channel || channel.type !== ChannelType.GuildText || !(await isTicketStaff(interaction))) {
        await interaction.reply({ content: '❌ Vous ne pouvez pas rouvrir ce ticket.', ephemeral: true });
        return;
    }
    if (getTicketState(channel) !== 'closed') {
        await interaction.reply({ content: 'ℹ️ Ce ticket est déjà ouvert.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    await channel.permissionOverwrites.edit(ownerId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
    }, { reason: `Ticket rouvert par ${interaction.user.tag}` });
    await channel.setTopic(`${TICKET_TOPIC_PREFIX}${ownerId}:open`, `Ticket rouvert par ${interaction.user.tag}`);
    await channel.send({
        content: `<@${ownerId}>`,
        embeds: [
            createKeplerEmbed()
                .setColor(KEPLER_COLORS.success)
                .setTitle('🔓 Ticket rouvert')
                .setDescription(`Le ticket a été rouvert par ${interaction.user}.`)
        ],
        components: [ticketControlRow(false)],
        allowedMentions: { users: [ownerId] }
    });
    await sendTicketLog(interaction.guild!, {
        title: '🔵 Ticket rouvert',
        description: `${channel} a été rouvert par ${interaction.user}. Créateur : <@${ownerId}>.`,
        color: KEPLER_COLORS.primary
    });
    await interaction.editReply('✅ Le ticket a été rouvert et son créateur a été prévenu.');
}

async function archiveTicket(interaction: ButtonInteraction): Promise<void> {
    const ownerId = getTicketOwnerId(interaction);
    const channel = interaction.channel;
    if (!ownerId || !channel || channel.type !== ChannelType.GuildText || !(await isTicketStaff(interaction))) {
        await interaction.reply({ content: '❌ Seule l’équipe peut archiver ce ticket.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    const config = await getTicketConfig(interaction.guildId!);
    if (!config.ticket_log_channel_id) {
        await interaction.editReply('❌ Configurez d’abord le salon des logs de tickets dans `/settings`.');
        return;
    }

    const messages = await fetchTicketMessages(channel);
    const transcript = buildTranscript(channel, ownerId, messages);
    const encoded = new TextEncoder().encode(transcript);
    const maxArchiveBytes = 7_500_000;
    const archiveBytes = encoded.length > maxArchiveBytes
        ? encoded.slice(0, maxArchiveBytes)
        : encoded;
    const attachment = new AttachmentBuilder(Buffer.from(archiveBytes), {
        name: `ticket-${ownerId}-${Date.now()}.txt`
    });
    const sent = await sendTicketLog(interaction.guild!, {
        title: '📦 Ticket archivé',
        description:
            `${channel} a été archivé par ${interaction.user}.\n` +
            `Créateur : <@${ownerId}> • ${messages.length} message(s)` +
            (encoded.length > maxArchiveBytes ? '\n⚠️ Archive tronquée à cause de sa taille.' : ''),
        color: KEPLER_COLORS.neutral,
        files: [attachment]
    });
    if (!sent) {
        await interaction.editReply('❌ Impossible d’envoyer l’archive dans le salon de logs configuré.');
        return;
    }
    await interaction.editReply('✅ Le contenu du ticket a été archivé dans le salon de logs.');
}

function getTicketOwnerId(interaction: ButtonInteraction): string | null {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText || !channel.topic?.startsWith(TICKET_TOPIC_PREFIX)) {
        return null;
    }
    const ownerId = channel.topic.slice(TICKET_TOPIC_PREFIX.length).split(':')[0];
    return /^\d{17,20}$/.test(ownerId) ? ownerId : null;
}

function getTicketState(channel: TextChannel): 'open' | 'closed' {
    return channel.topic?.endsWith(':closed') ? 'closed' : 'open';
}

function ticketControlRow(closed: boolean): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();
    if (closed) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('ticket:reopen')
                .setLabel('Rouvrir')
                .setEmoji('🔓')
                .setStyle(ButtonStyle.Success)
        );
    }
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('ticket:archive')
            .setLabel('Archiver')
            .setEmoji('📦')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('ticket:close')
            .setLabel(closed ? 'Clôturer définitivement' : 'Fermer le ticket')
            .setEmoji(closed ? '🗑️' : '🔒')
            .setStyle(ButtonStyle.Danger)
    );
    return row;
}

async function fetchTicketMessages(channel: TextChannel): Promise<Message[]> {
    const messages: Message[] = [];
    let before: string | undefined;
    // Limite volontaire pour éviter qu'un salon abusivement volumineux ne bloque le bot.
    for (let page = 0; page < 50; page++) {
        const batch = await channel.messages.fetch({ limit: 100, before });
        if (batch.size === 0) break;
        messages.push(...batch.values());
        before = batch.last()?.id;
        if (batch.size < 100 || !before) break;
    }
    return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function buildTranscript(channel: TextChannel, ownerId: string, messages: Message[]): string {
    const header = [
        `Archive du ticket #${channel.name}`,
        `Serveur: ${channel.guild.name} (${channel.guild.id})`,
        `Créateur: ${ownerId}`,
        `Salon: ${channel.id}`,
        `Générée le: ${new Date().toISOString()}`,
        `Messages exportés: ${messages.length}`,
        '',
        '---',
        ''
    ];
    const lines = messages.flatMap(message => {
        const attachments = [...message.attachments.values()]
            .map(attachment => `  Pièce jointe: ${attachment.name || 'fichier'} — ${attachment.url}`);
        const embeds = message.embeds
            .map(embed => `  Embed: ${embed.title || ''} ${embed.description || ''}`.trimEnd());
        return [
            `[${message.createdAt.toISOString()}] ${message.author.tag} (${message.author.id})`,
            message.content || '(aucun contenu texte)',
            ...attachments,
            ...embeds,
            ''
        ];
    });
    return [...header, ...lines].join('\n');
}

async function sendTicketLog(
    guild: Guild,
    payload: {
        title: string;
        description: string;
        color: number;
        files?: AttachmentBuilder[];
    }
): Promise<boolean> {
    try {
        const config = await getTicketConfig(guild.id);
        if (!config.ticket_log_channel_id) return false;
        const channel = await guild.channels.fetch(config.ticket_log_channel_id);
        if (!channel || channel.type !== ChannelType.GuildText) return false;
        await channel.send({
            embeds: [
                createKeplerEmbed()
                    .setColor(payload.color)
                    .setTitle(payload.title)
                    .setDescription(payload.description)
                    .setFooter({ text: guild.name })
            ],
            files: payload.files,
            allowedMentions: { parse: [] }
        });
        return true;
    } catch (error) {
        logger.error('Impossible d’envoyer un log de ticket', error, 'Tickets');
        return false;
    }
}

async function isTicketStaff(interaction: ButtonInteraction): Promise<boolean> {
    const member = await interaction.guild!.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return false;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
    const config = await getTicketConfig(interaction.guildId!);
    return !!config.ticket_support_role_id && member.roles.cache.has(config.ticket_support_role_id);
}

function ticketChannelName(username: string, userId: string): string {
    const safeName = username
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 70) || 'utilisateur';
    return `ticket-${safeName}-${userId.slice(-4)}`;
}
