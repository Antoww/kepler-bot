import { createKeplerEmbed, KEPLER_COLORS } from '../../utils/theme.ts';
import {
    EmbedBuilder,
    AuditLogEvent,
    AttachmentBuilder,
    TextChannel,
    Message,
    PartialMessage
} from 'discord.js';
import { getLogChannel } from '../../database/supabase.ts';

// Fonction utilitaire pour envoyer un log
async function sendLog(guild: any, embed: EmbedBuilder, files: AttachmentBuilder[] = []) {
    try {
        const logChannelId = await getLogChannel(guild.id);
        if (!logChannelId) return;

        const logChannel = await guild.channels.fetch(logChannelId) as TextChannel;
        if (!logChannel) return;

        await logChannel.send({ embeds: [embed], files });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du log:', error);
    }
}

// Fonction pour récupérer l'audit log
async function getAuditLog(guild: any, targetId: string, actionType: AuditLogEvent) {
    try {
        const auditLogs = await guild.fetchAuditLogs({
            type: actionType,
            limit: 1,
        });

        const entry = auditLogs.entries.first();
        return entry;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'audit log:', error);
        return null;
    }
}

// Log de suppression de message
export async function logMessageDelete(message: Message | PartialMessage) {
    if (!message.guild || message.author?.bot) return;

    const auditEntry = await getAuditLog(message.guild, message.id, AuditLogEvent.MessageDelete);
    const client = message.client;

    const fields: any[] = [
        { name: '💬 Canal', value: `<#${message.channel.id}>\n\`${message.channel.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    ];

    if (message.author) {
        fields.push({ name: '✍️ Auteur', value: `${message.author.tag}\n\`${message.author.id}\``, inline: true });
    }

    if (auditEntry?.executor) {
        fields.push({ name: '🗑️ Supprimé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    // Ajouter le contenu du message s'il est disponible
    if (message.content && message.content.length > 0) {
        const content = message.content.length > 1000 ? message.content.substring(0, 997) + '...' : message.content;
        fields.push({
            name: '📝 Contenu du message',
            value: `\`\`\`${content}\`\`\``,
            inline: false
        });
    }

    // Ajouter les pièces jointes s'il y en a
    if (message.attachments && message.attachments.size > 0) {
        const attachments = message.attachments.map(att => `• ${att.name || att.url}`).join('\n');
        fields.push({
            name: '📎 Pièces jointes',
            value: attachments.length > 1024 ? attachments.substring(0, 1021) + '...' : attachments,
            inline: false
        });
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.danger)
        .setTitle('🗑️ Message Supprimé')
        .setDescription(`### Message supprimé\n> Un message a été supprimé dans <#${message.channel.id}>.`)
        .addFields(fields)
        .setThumbnail(message.author?.displayAvatarURL({ forceStatic: false }) || null)
        .setFooter({
            text: `Logs Messages`,
            iconURL: message.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(message.guild, embed);
}

// Log de modification de message
export async function logMessageUpdate(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (!oldMessage.content && !newMessage.content) return;
    if (oldMessage.content === newMessage.content) return;

    const client = newMessage.client;
    const fields: any[] = [
        { name: '💬 Canal', value: `<#${newMessage.channel.id}>\n\`${newMessage.channel.id}\``, inline: true },
        { name: '🆔 Message ID', value: `\`${newMessage.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    if (newMessage.author) {
        fields.push({ name: '✍️ Auteur', value: `${newMessage.author.tag}\n\`${newMessage.author.id}\``, inline: true });
    }

    // Ajouter l'ancien contenu
    if (oldMessage.content) {
        const oldContent = oldMessage.content.length > 500 ? oldMessage.content.substring(0, 497) + '...' : oldMessage.content;
        fields.push({
            name: '📝 Ancien contenu',
            value: `\`\`\`${oldContent}\`\`\``,
            inline: false
        });
    }

    // Ajouter le nouveau contenu
    if (newMessage.content) {
        const newContent = newMessage.content.length > 500 ? newMessage.content.substring(0, 497) + '...' : newMessage.content;
        fields.push({
            name: '✨ Nouveau contenu',
            value: `\`\`\`${newContent}\`\`\``,
            inline: false
        });
    }

    // Ajouter le lien vers le message
    if (newMessage.url) {
        fields.push({
            name: '🔗 Lien',
            value: `[Aller au message](${newMessage.url})`,
            inline: false
        });
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.warning)
        .setTitle('✏️ Message Modifié')
        .setDescription(`### Message édité\n> Un message a été modifié dans <#${newMessage.channel.id}>.`)
        .addFields(fields)
        .setThumbnail(newMessage.author?.displayAvatarURL({ forceStatic: false }) || null)
        .setFooter({
            text: `Logs Messages`,
            iconURL: newMessage.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(newMessage.guild, embed);
}

// Log de suppression en masse de messages
export async function logMessageBulkDelete(messages: any, channel: any) {
    if (!channel.guild) return;

    const auditEntry = await getAuditLog(channel.guild, channel.id, AuditLogEvent.MessageBulkDelete);
    const client = channel.client;

    const fields: any[] = [
        { name: '💬 Canal', value: `<#${channel.id}>\n\`${channel.id}\``, inline: true },
        { name: '📊 Quantité', value: `${messages.size} messages`, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '🗑️ Supprimé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    // Ajouter le lien d'archive si disponible
    if (messages.archiveUrl) {
        fields.push({
            name: '📄 Archive des messages',
            value: `[Voir les messages supprimés](${messages.archiveUrl})`,
            inline: false
        });
    }
    if (messages.archiveContent) {
        fields.push({
            name: '📄 Archive des messages',
            value: 'L’archive texte complète est jointe à ce log.',
            inline: false
        });
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.danger)
        .setTitle('🗑️ Suppression de masse')
        .setDescription(`### Nettoyage de messages\n> **${messages.size}** messages ont été supprimés dans <#${channel.id}>.`)
        .addFields(fields)
        .setThumbnail(channel.guild.iconURL({ forceStatic: false }))
        .setFooter({
            text: `Logs Messages • ${messages.size} messages supprimés`,
            iconURL: channel.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    const files = messages.archiveContent
        ? [new AttachmentBuilder(
            new TextEncoder().encode(messages.archiveContent),
            { name: messages.archiveFilename || `clear-${channel.id}.txt` }
        )]
        : [];
    await sendLog(channel.guild, embed, files);
}
