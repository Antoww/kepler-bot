import { 
    EmbedBuilder, 
    AuditLogEvent, 
    TextChannel,
    Message,
    PartialMessage
} from 'discord.js';
import { getLogChannel } from '../../database/supabase.ts';

// Fonction utilitaire pour envoyer un log
async function sendLog(guild: any, embed: EmbedBuilder) {
    try {
        const logChannelId = await getLogChannel(guild.id);
        if (!logChannelId) return;

        const logChannel = await guild.channels.fetch(logChannelId) as TextChannel;
        if (!logChannel) return;

        await logChannel.send({ embeds: [embed] });
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
    
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Message Supprimé')
        .setDescription(`**Canal:** <#${message.channel.id}> (${message.channel.id})`)
        .addFields(
            { name: 'Auteur du message', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Inconnu', inline: true },
            { name: 'Supprimé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : message.author?.tag || 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    // Ajouter le contenu du message s'il est disponible
    if (message.content && message.content.length > 0) {
        embed.addFields({
            name: 'Contenu du message',
            value: message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content,
            inline: false
        });
    }

    // Ajouter les pièces jointes s'il y en a
    if (message.attachments && message.attachments.size > 0) {
        const attachments = message.attachments.map(att => att.name || att.url).join('\n');
        embed.addFields({
            name: 'Pièces jointes',
            value: attachments.length > 1024 ? attachments.substring(0, 1021) + '...' : attachments,
            inline: false
        });
    }

    await sendLog(message.guild, embed);
}

// Log de modification de message
export async function logMessageUpdate(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (!oldMessage.content && !newMessage.content) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('✏️ Message Modifié')
        .setDescription(`**Canal:** <#${newMessage.channel.id}> (${newMessage.channel.id})`)
        .addFields(
            { name: 'Auteur', value: newMessage.author ? `${newMessage.author.tag} (${newMessage.author.id})` : 'Inconnu', inline: true },
            { name: 'Message ID', value: newMessage.id, inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    // Ajouter l'ancien contenu
    if (oldMessage.content) {
        embed.addFields({
            name: 'Ancien contenu',
            value: oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1021) + '...' : oldMessage.content,
            inline: false
        });
    }

    // Ajouter le nouveau contenu
    if (newMessage.content) {
        embed.addFields({
            name: 'Nouveau contenu',
            value: newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content,
            inline: false
        });
    }

    // Ajouter le lien vers le message
    if (newMessage.url) {
        embed.addFields({
            name: 'Lien vers le message',
            value: `[Voir le message](${newMessage.url})`,
            inline: false
        });
    }

    await sendLog(newMessage.guild, embed);
}

// Log de suppression en masse de messages
export async function logMessageBulkDelete(messages: any, channel: any) {
    if (!channel.guild) return;

    const auditEntry = await getAuditLog(channel.guild, channel.id, AuditLogEvent.MessageBulkDelete);
    
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Suppression en Masse de Messages')
        .setDescription(`**Canal:** <#${channel.id}> (${channel.id})`)
        .addFields(
            { name: 'Nombre de messages', value: messages.size.toString(), inline: true },
            { name: 'Supprimé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(channel.guild, embed);
}
