import { 
    EmbedBuilder, 
    AuditLogEvent, 
    TextChannel,
    Invite,
    GuildEmoji,
    Sticker
} from 'discord.js';
import { getLogChannel } from '../database/supabase.ts';

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

// Log de création d'invitation
export async function logInviteCreate(invite: Invite) {
    if (!invite.guild) return;

    const auditEntry = await getAuditLog(invite.guild, invite.code, AuditLogEvent.InviteCreate);
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('📬 Invitation Créée')
        .setDescription(`**Code:** ${invite.code}`)
        .addFields(
            { name: 'Canal', value: invite.channel ? `<#${invite.channel.id}>` : 'Inconnu', inline: true },
            { name: 'Créée par', value: invite.inviter ? `${invite.inviter.tag} (${invite.inviter.id})` : auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Utilisation max', value: invite.maxUses ? invite.maxUses.toString() : 'Illimitée', inline: true },
            { name: 'Expire le', value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:F>` : 'Jamais', inline: true },
            { name: 'Date de création', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    if (invite.temporary) {
        embed.addFields({
            name: 'Temporaire',
            value: 'Oui (l\'utilisateur sera expulsé à la déconnexion)',
            inline: false
        });
    }

    await sendLog(invite.guild, embed);
}

// Log de suppression d'invitation
export async function logInviteDelete(invite: Invite) {
    if (!invite.guild) return;

    const auditEntry = await getAuditLog(invite.guild, invite.code, AuditLogEvent.InviteDelete);
    
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Invitation Supprimée')
        .setDescription(`**Code:** ${invite.code}`)
        .addFields(
            { name: 'Canal', value: invite.channel ? `<#${invite.channel.id}>` : 'Inconnu', inline: true },
            { name: 'Créée par', value: invite.inviter ? `${invite.inviter.tag} (${invite.inviter.id})` : 'Inconnu', inline: true },
            { name: 'Supprimée par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Utilisations', value: invite.uses ? invite.uses.toString() : '0', inline: true },
            { name: 'Date de suppression', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(invite.guild, embed);
}

// Log de création d'emoji
export async function logEmojiCreate(emoji: GuildEmoji) {
    const auditEntry = await getAuditLog(emoji.guild, emoji.id, AuditLogEvent.EmojiCreate);
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('😀 Emoji Créé')
        .setDescription(`**Nom:** ${emoji.name} (${emoji.id})`)
        .addFields(
            { name: 'Créé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Animé', value: emoji.animated ? 'Oui' : 'Non', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp();

    await sendLog(emoji.guild, embed);
}

// Log de suppression d'emoji
export async function logEmojiDelete(emoji: GuildEmoji) {
    const auditEntry = await getAuditLog(emoji.guild, emoji.id, AuditLogEvent.EmojiDelete);
    
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Emoji Supprimé')
        .setDescription(`**Nom:** ${emoji.name} (${emoji.id})`)
        .addFields(
            { name: 'Supprimé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Animé', value: emoji.animated ? 'Oui' : 'Non', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp();

    await sendLog(emoji.guild, embed);
}

// Log de modification d'emoji
export async function logEmojiUpdate(oldEmoji: GuildEmoji, newEmoji: GuildEmoji) {
    const auditEntry = await getAuditLog(newEmoji.guild, newEmoji.id, AuditLogEvent.EmojiUpdate);
    
    const changes: string[] = [];
    
    if (oldEmoji.name !== newEmoji.name) {
        changes.push(`**Nom:** ${oldEmoji.name} → ${newEmoji.name}`);
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('✏️ Emoji Modifié')
        .setDescription(`**Emoji:** ${newEmoji.name} (${newEmoji.id})`)
        .addFields(
            { name: 'Modifications', value: changes.join('\n'), inline: false },
            { name: 'Modifié par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(newEmoji.url)
        .setTimestamp();

    await sendLog(newEmoji.guild, embed);
}

// Log de création de sticker
export async function logStickerCreate(sticker: Sticker) {
    if (!sticker.guild) return;

    const auditEntry = await getAuditLog(sticker.guild, sticker.id, AuditLogEvent.StickerCreate);
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🏷️ Sticker Créé')
        .setDescription(`**Nom:** ${sticker.name} (${sticker.id})`)
        .addFields(
            { name: 'Créé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Description', value: sticker.description || 'Aucune', inline: true },
            { name: 'Tags', value: sticker.tags || 'Aucun', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(sticker.guild, embed);
}

// Log de suppression de sticker
export async function logStickerDelete(sticker: Sticker) {
    if (!sticker.guild) return;

    const auditEntry = await getAuditLog(sticker.guild, sticker.id, AuditLogEvent.StickerDelete);
    
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Sticker Supprimé')
        .setDescription(`**Nom:** ${sticker.name} (${sticker.id})`)
        .addFields(
            { name: 'Supprimé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Description', value: sticker.description || 'Aucune', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(sticker.guild, embed);
}
