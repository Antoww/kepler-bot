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
    if (interaction.customId.startsWith('ticket:confirm-close:')) {
        await closeTicket(interaction);
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
            channel.type === ChannelType.GuildText && channel.topic === topic
        );
        if (existing) {
            await interaction.editReply(`Vous avez déjà un ticket ouvert : ${existing}`);
            return;
        }

        const panelChannel = guild.channels.cache.get(config.ticket_panel_channel_id);
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
            parent: panelChannel?.parentId ?? undefined,
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
    if (!ownerId || !(await canCloseTicket(interaction, ownerId))) {
        await interaction.reply({ content: '❌ Vous ne pouvez pas fermer ce ticket.', ephemeral: true });
        return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket:confirm-close:${ownerId}`)
            .setLabel('Confirmer la fermeture')
            .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({
        content: 'Cette action supprimera définitivement le salon. Confirmer ?',
        components: [row],
        ephemeral: true
    });
}

async function closeTicket(interaction: ButtonInteraction): Promise<void> {
    const ownerId = getTicketOwnerId(interaction);
    const expectedOwnerId = interaction.customId.split(':')[2];
    if (!ownerId || ownerId !== expectedOwnerId || !(await canCloseTicket(interaction, ownerId))) {
        await interaction.reply({ content: '❌ Confirmation de fermeture invalide.', ephemeral: true });
        return;
    }

    await interaction.reply({ content: '🔒 Fermeture du ticket…', ephemeral: true });
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) return;
    await channel.delete(`Ticket fermé par ${interaction.user.tag}`);
}

function getTicketOwnerId(interaction: ButtonInteraction): string | null {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText || !channel.topic?.startsWith(TICKET_TOPIC_PREFIX)) {
        return null;
    }
    const ownerId = channel.topic.slice(TICKET_TOPIC_PREFIX.length);
    return /^\d{17,20}$/.test(ownerId) ? ownerId : null;
}

async function canCloseTicket(interaction: ButtonInteraction, ownerId: string): Promise<boolean> {
    if (interaction.user.id === ownerId) return true;
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
