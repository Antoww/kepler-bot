import { 
    EmbedBuilder, 
    AuditLogEvent, 
    TextChannel,
    Invite,
    GuildEmoji,
    Sticker
} from 'discord.js';
import { getLogChannel } from '../../database/supabase.ts';
import { logger } from '../../utils/logger.ts';

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
    const client = invite.client;
    
    const fields: any[] = [
        { name: '📬 Code', value: `\`${invite.code}\``, inline: true },
        { name: '📢 Canal', value: invite.channel ? `<#${invite.channel.id}>\n\`${invite.channel.id}\`` : 'Inconnu', inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    const creator = invite.inviter || auditEntry?.executor;
    if (creator) {
        fields.push({ name: '✍️ Créée par', value: `${creator.tag}\n\`${creator.id}\``, inline: true });
    }

    fields.push(
        { name: '🔢 Utilisations max', value: invite.maxUses ? `${invite.maxUses}` : 'Illimitée', inline: true },
        { name: '⏱️ Expiration', value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:F>` : 'Jamais', inline: true }
    );

    if (invite.temporary) {
        fields.push({
            name: '⚠️ Temporaire',
            value: 'Oui (expulsion à la déconnexion)',
            inline: false
        });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#57F287')
        .setTitle('📬 Invitation Créée')
        .setDescription(`### Nouvelle invitation\n> Une invitation a été créée avec le code \`${invite.code}\`.`)
        .addFields(fields)
        .setThumbnail(invite.inviter?.displayAvatarURL({ forceStatic: false }) || invite.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Invitations`,
            iconURL: invite.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(invite.guild, embed);
}

// Log de suppression d'invitation
export async function logInviteDelete(invite: Invite) {
    if (!invite.guild) return;

    const auditEntry = await getAuditLog(invite.guild, invite.code, AuditLogEvent.InviteDelete);
    const client = invite.client;
    
    const fields: any[] = [
        { name: '📬 Code', value: `\`${invite.code}\``, inline: true },
        { name: '📢 Canal', value: invite.channel ? `<#${invite.channel.id}>\n\`${invite.channel.id}\`` : 'Inconnu', inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    if (invite.inviter) {
        fields.push({ name: '✍️ Créée par', value: `${invite.inviter.tag}\n\`${invite.inviter.id}\``, inline: true });
    }

    if (auditEntry?.executor) {
        fields.push({ name: '🗑️ Supprimée par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    fields.push({ name: '📊 Utilisations', value: invite.uses ? `${invite.uses}` : '0', inline: true });

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#ED4245')
        .setTitle('🗑️ Invitation Supprimée')
        .setDescription(`### Invitation supprimée\n> L'invitation \`${invite.code}\` a été supprimée.`)
        .addFields(fields)
        .setThumbnail(auditEntry?.executor?.displayAvatarURL({ forceStatic: false }) || invite.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Invitations`,
            iconURL: invite.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(invite.guild, embed);
}

// Log de création d'emoji
export async function logEmojiCreate(emoji: GuildEmoji) {
    const auditEntry = await getAuditLog(emoji.guild, emoji.id, AuditLogEvent.EmojiCreate);
    const client = emoji.client;
    
    const fields: any[] = [
        { name: '😀 Nom', value: `\`${emoji.name}\``, inline: true },
        { name: '🆔 ID', value: `\`${emoji.id}\``, inline: true },
        { name: '✨ Animé', value: emoji.animated ? 'Oui' : 'Non', inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '✍️ Créé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#57F287')
        .setTitle('😀 Emoji Créé')
        .setDescription(`### Nouvel emoji\n> L'emoji **${emoji.name}** a été ajouté au serveur.`)
        .addFields(fields)
        .setThumbnail(emoji.url)
        .setFooter({ 
            text: `Logs Emojis`,
            iconURL: emoji.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(emoji.guild, embed);
}

// Log de suppression d'emoji
export async function logEmojiDelete(emoji: GuildEmoji) {
    const auditEntry = await getAuditLog(emoji.guild, emoji.id, AuditLogEvent.EmojiDelete);
    const client = emoji.client;
    
    const fields: any[] = [
        { name: '😀 Nom', value: `\`${emoji.name}\``, inline: true },
        { name: '🆔 ID', value: `\`${emoji.id}\``, inline: true },
        { name: '✨ Animé', value: emoji.animated ? 'Oui' : 'Non', inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '🗑️ Supprimé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#ED4245')
        .setTitle('🗑️ Emoji Supprimé')
        .setDescription(`### Emoji supprimé\n> L'emoji **${emoji.name}** a été supprimé du serveur.`)
        .addFields(fields)
        .setThumbnail(emoji.url)
        .setFooter({ 
            text: `Logs Emojis`,
            iconURL: emoji.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(emoji.guild, embed);
}

// Log de modification d'emoji
export async function logEmojiUpdate(oldEmoji: GuildEmoji, newEmoji: GuildEmoji) {
    try {
        const auditEntry = await getAuditLog(newEmoji.guild, newEmoji.id, AuditLogEvent.EmojiUpdate);
        const client = newEmoji.client;
        
        const changes: string[] = [];
        
        if (oldEmoji.name !== newEmoji.name) {
            changes.push(`**Ancien nom:** \`${oldEmoji.name}\`\n**Nouveau nom:** \`${newEmoji.name}\``);
        }

        if (changes.length === 0) {
            logger.debug(`Emoji ${newEmoji.name} modifié mais aucun changement détecté`, undefined, 'Logs');
            return;
        }
        
        logger.info(`Emoji modifié: ${oldEmoji.name} → ${newEmoji.name}`, undefined, 'Logs');

    const fields: any[] = [
        { name: '🆔 ID', value: `\`${newEmoji.id}\``, inline: true },
        { name: '✨ Animé', value: newEmoji.animated ? 'Oui' : 'Non', inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        { name: '📝 Modifications', value: changes.join('\n'), inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '✏️ Modifié par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#FEE75C')
        .setTitle('✏️ Emoji Modifié')
        .setDescription(`### Modification d'emoji\n> L'emoji **${newEmoji.name}** a été modifié.`)
        .addFields(fields)
        .setThumbnail(newEmoji.url)
        .setFooter({ 
            text: `Logs Emojis`,
            iconURL: newEmoji.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

        await sendLog(newEmoji.guild, embed);
    } catch (error) {
        logger.error('Erreur log emoji update', error, 'Logs');
    }
}

// Log de création de sticker
export async function logStickerCreate(sticker: Sticker) {
    if (!sticker.guild) return;

    const auditEntry = await getAuditLog(sticker.guild, sticker.id, AuditLogEvent.StickerCreate);
    const client = sticker.guild.client;
    
    const fields: any[] = [
        { name: '🏷️ Nom', value: `\`${sticker.name}\``, inline: true },
        { name: '🆔 ID', value: `\`${sticker.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    if (sticker.description) {
        fields.push({ name: '📝 Description', value: sticker.description, inline: false });
    }

    if (sticker.tags) {
        fields.push({ name: '🏷️ Tags', value: sticker.tags, inline: true });
    }

    if (auditEntry?.executor) {
        fields.push({ name: '✍️ Créé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#57F287')
        .setTitle('🏷️ Sticker Créé')
        .setDescription(`### Nouveau sticker\n> Le sticker **${sticker.name}** a été ajouté au serveur.`)
        .addFields(fields)
        .setThumbnail(sticker.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Stickers`,
            iconURL: sticker.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(sticker.guild, embed);
}

// Log de suppression de sticker
export async function logStickerDelete(sticker: Sticker) {
    if (!sticker.guild) return;

    const auditEntry = await getAuditLog(sticker.guild, sticker.id, AuditLogEvent.StickerDelete);
    const client = sticker.guild.client;
    
    const fields: any[] = [
        { name: '🏷️ Nom', value: `\`${sticker.name}\``, inline: true },
        { name: '🆔 ID', value: `\`${sticker.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    if (sticker.description) {
        fields.push({ name: '📝 Description', value: sticker.description, inline: false });
    }

    if (auditEntry?.executor) {
        fields.push({ name: '🗑️ Supprimé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#ED4245')
        .setTitle('🗑️ Sticker Supprimé')
        .setDescription(`### Sticker supprimé\n> Le sticker **${sticker.name}** a été supprimé du serveur.`)
        .addFields(fields)
        .setThumbnail(sticker.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Stickers`,
            iconURL: sticker.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(sticker.guild, embed);
}
