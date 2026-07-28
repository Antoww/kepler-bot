import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    type ButtonInteraction,
    type OverwriteResolvable,
    PermissionFlagsBits
} from 'discord.js';
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
        const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket:close')
                .setLabel('Fermer le ticket')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );
        const supportMention = supportRole
            ? `${supportRole} `
            : '';
        await channel.send({
            content: `${supportMention}${interaction.user}`,
            embeds: [welcome],
            components: [closeRow],
            allowedMentions: {
                users: [interaction.user.id],
                roles: supportRole ? [supportRole.id] : []
            }
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
            .setCustomId(isOwner
                ? `ticket:confirm-user-close:${ownerId}`
                : `ticket:confirm-delete:${ownerId}`)
            .setLabel(isOwner ? 'Confirmer et quitter' : 'Clôturer définitivement')
            .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
        content: isOwner
            ? 'Vous perdrez l’accès au ticket. L’équipe pourra ensuite le clôturer définitivement. Confirmer ?'
            : 'Cette action supprimera définitivement le salon du ticket. Confirmer ?',
        components: [row],
        ephemeral: true
    });
}

async function removeTicketOwner(interaction: ButtonInteraction): Promise<void> {
    const ownerId = getTicketOwnerId(interaction);
    const expectedOwnerId = interaction.customId.split(':')[3];
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
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket:close')
                    .setLabel('Clôturer définitivement')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger)
            )
        ],
        allowedMentions: { parse: [] }
    });
    await interaction.editReply('✅ Vous avez été retiré du ticket.');
}

async function deleteTicket(interaction: ButtonInteraction): Promise<void> {
    const ownerId = getTicketOwnerId(interaction);
    const expectedOwnerId = interaction.customId.split(':')[3];
    if (!ownerId || ownerId !== expectedOwnerId || !(await isTicketStaff(interaction))) {
        await interaction.reply({ content: '❌ Confirmation de clôture invalide.', ephemeral: true });
        return;
    }

    await interaction.reply({ content: '🗑️ Clôture définitive du ticket…', ephemeral: true });
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) return;
    await channel.delete(`Ticket clôturé par ${interaction.user.tag}`);
}

function getTicketOwnerId(interaction: ButtonInteraction): string | null {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText || !channel.topic?.startsWith(TICKET_TOPIC_PREFIX)) {
        return null;
    }
    const ownerId = channel.topic.slice(TICKET_TOPIC_PREFIX.length).split(':')[0];
    return /^\d{17,20}$/.test(ownerId) ? ownerId : null;
}

async function isTicketStaff(interaction: ButtonInteraction): Promise<boolean> {
    const member = await interaction.guild!.members.fetch(interaction.user.id).catch(() => null);
    if (!member) return false;
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
