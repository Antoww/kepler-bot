import { 
    EmbedBuilder, 
    AuditLogEvent, 
    ChannelType,
    GuildAuditLogsEntry,
    TextChannel,
    GuildChannel,
    Role,
    GuildMember,
    User
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

// Log de création de canal
export async function logChannelCreate(channel: GuildChannel) {
    if (!channel.guild) return;

    const auditEntry = await getAuditLog(channel.guild, channel.id, AuditLogEvent.ChannelCreate);
    
    const fields: any[] = [
        { name: 'Type', value: getChannelTypeName(channel.type), inline: true },
        { name: 'Créé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
        { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    ];

    // Ajouter des informations supplémentaires selon le type de canal
    if (channel.isTextBased()) {
        const textChannel = channel as TextChannel;
        
        if (textChannel.topic) {
            const topicTrunc = textChannel.topic.length > 100 ? textChannel.topic.substring(0, 100) + '...' : textChannel.topic;
            fields.push({ name: 'Description', value: topicTrunc, inline: false });
        }
        
        if (textChannel.rateLimitPerUser > 0) {
            fields.push({ name: 'Mode lent', value: `${textChannel.rateLimitPerUser}s`, inline: true });
        }
        
        if (textChannel.nsfw) {
            fields.push({ name: 'NSFW', value: 'Oui', inline: true });
        }
    }

    // Vérifier si le canal a une catégorie parent
    if (channel.parent) {
        fields.push({ name: 'Catégorie', value: channel.parent.name, inline: true });
    }

    // Vérifier les permissions personnalisées
    const permOverwrites = channel.permissionOverwrites?.cache;
    if (permOverwrites && permOverwrites.size > 0) {
        fields.push({ name: 'Permissions personnalisées', value: `${permOverwrites.size} override(s)`, inline: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('📝 Canal Créé')
        .setDescription(`**Canal:** ${channel.name} (${channel.id})`)
        .addFields(fields)
        .setTimestamp();

    await sendLog(channel.guild, embed);
}

// Log de suppression de canal
export async function logChannelDelete(channel: GuildChannel) {
    if (!channel.guild) return;

    const auditEntry = await getAuditLog(channel.guild, channel.id, AuditLogEvent.ChannelDelete);
    
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Canal Supprimé')
        .setDescription(`**Canal:** ${channel.name} (${channel.id})`)
        .addFields(
            { name: 'Type', value: getChannelTypeName(channel.type), inline: true },
            { name: 'Supprimé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(channel.guild, embed);
}

// Log de modification de canal
export async function logChannelUpdate(oldChannel: GuildChannel, newChannel: GuildChannel) {
    if (!newChannel.guild) return;

    const auditEntry = await getAuditLog(newChannel.guild, newChannel.id, AuditLogEvent.ChannelUpdate);
    
    const changes: string[] = [];
    
    if (oldChannel.name !== newChannel.name) {
        changes.push(`**Nom:** ${oldChannel.name} → ${newChannel.name}`);
    }
    
    if (oldChannel.type !== newChannel.type) {
        changes.push(`**Type:** ${getChannelTypeName(oldChannel.type)} → ${getChannelTypeName(newChannel.type)}`);
    }

    // Vérifier les changements de topic/description pour les canaux texte
    if (oldChannel.isTextBased() && newChannel.isTextBased()) {
        const oldTopic = (oldChannel as TextChannel).topic || 'Aucune';
        const newTopic = (newChannel as TextChannel).topic || 'Aucune';
        if (oldTopic !== newTopic) {
            const oldTopicTrunc = oldTopic.length > 100 ? oldTopic.substring(0, 100) + '...' : oldTopic;
            const newTopicTrunc = newTopic.length > 100 ? newTopic.substring(0, 100) + '...' : newTopic;
            changes.push(`**Description:** ${oldTopicTrunc} → ${newTopicTrunc}`);
        }

        // Vérifier le slowmode
        const oldRate = (oldChannel as TextChannel).rateLimitPerUser || 0;
        const newRate = (newChannel as TextChannel).rateLimitPerUser || 0;
        if (oldRate !== newRate) {
            changes.push(`**Mode lent:** ${oldRate}s → ${newRate}s`);
        }

        // Vérifier NSFW
        const oldNsfw = (oldChannel as TextChannel).nsfw;
        const newNsfw = (newChannel as TextChannel).nsfw;
        if (oldNsfw !== newNsfw) {
            changes.push(`**NSFW:** ${oldNsfw ? 'Oui' : 'Non'} → ${newNsfw ? 'Oui' : 'Non'}`);
        }
    }

    // Vérifier les changements de permissions
    const oldPermissions = oldChannel.permissionOverwrites?.cache;
    const newPermissions = newChannel.permissionOverwrites?.cache;
    
    if (oldPermissions && newPermissions) {
        // Vérifier si des permissions ont été ajoutées
        for (const [id, perm] of newPermissions) {
            const oldPerm = oldPermissions.get(id);
            if (!oldPerm) {
                const targetName = perm.type === 0 ? `<@&${id}>` : `<@${id}>`;
                changes.push(`**Permission ajoutée pour:** ${targetName}`);
            } else {
                // Comparer les permissions
                const allowChanges = oldPerm.allow.bitfield !== perm.allow.bitfield;
                const denyChanges = oldPerm.deny.bitfield !== perm.deny.bitfield;
                
                if (allowChanges || denyChanges) {
                    const targetName = perm.type === 0 ? `<@&${id}>` : `<@${id}>`;
                    changes.push(`**Permissions modifiées pour:** ${targetName}`);
                }
            }
        }
        
        // Vérifier si des permissions ont été supprimées
        for (const [id, perm] of oldPermissions) {
            if (!newPermissions.has(id)) {
                const targetName = perm.type === 0 ? `<@&${id}>` : `<@${id}>`;
                changes.push(`**Permission supprimée pour:** ${targetName}`);
            }
        }
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('✏️ Canal Modifié')
        .setDescription(`**Canal:** ${newChannel.name} (${newChannel.id})`)
        .addFields(
            { name: 'Modifications', value: changes.join('\n'), inline: false },
            { name: 'Modifié par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(newChannel.guild, embed);
}

// Log de création de rôle
export async function logRoleCreate(role: Role) {
    const auditEntry = await getAuditLog(role.guild, role.id, AuditLogEvent.RoleCreate);
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎭 Rôle Créé')
        .setDescription(`**Rôle:** ${role.name} (${role.id})`)
        .addFields(
            { name: 'Couleur', value: role.hexColor, inline: true },
            { name: 'Permissions', value: role.permissions.toArray().length > 0 ? role.permissions.toArray().slice(0, 5).join(', ') : 'Aucune', inline: true },
            { name: 'Créé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(role.guild, embed);
}

// Log de suppression de rôle
export async function logRoleDelete(role: Role) {
    const auditEntry = await getAuditLog(role.guild, role.id, AuditLogEvent.RoleDelete);
    
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Rôle Supprimé')
        .setDescription(`**Rôle:** ${role.name} (${role.id})`)
        .addFields(
            { name: 'Couleur', value: role.hexColor, inline: true },
            { name: 'Supprimé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(role.guild, embed);
}

// Log de modification de rôle
export async function logRoleUpdate(oldRole: Role, newRole: Role) {
    const auditEntry = await getAuditLog(newRole.guild, newRole.id, AuditLogEvent.RoleUpdate);
    
    const changes: string[] = [];
    
    if (oldRole.name !== newRole.name) {
        changes.push(`**Nom:** ${oldRole.name} → ${newRole.name}`);
    }
    
    if (oldRole.hexColor !== newRole.hexColor) {
        changes.push(`**Couleur:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    }

    // Vérifier les permissions
    const oldPerms = oldRole.permissions.bitfield;
    const newPerms = newRole.permissions.bitfield;
    
    if (oldPerms !== newPerms) {
        const addedPerms = newRole.permissions.toArray().filter(p => !oldRole.permissions.has(p));
        const removedPerms = oldRole.permissions.toArray().filter(p => !newRole.permissions.has(p));
        
        if (addedPerms.length > 0) {
            changes.push(`**Permissions ajoutées:** ${addedPerms.slice(0, 5).join(', ')}${addedPerms.length > 5 ? ` (+${addedPerms.length - 5})` : ''}`);
        }
        
        if (removedPerms.length > 0) {
            changes.push(`**Permissions retirées:** ${removedPerms.slice(0, 5).join(', ')}${removedPerms.length > 5 ? ` (+${removedPerms.length - 5})` : ''}`);
        }
    }

    // Vérifier le hoisting
    if (oldRole.hoist !== newRole.hoist) {
        changes.push(`**Affiché séparément:** ${oldRole.hoist ? 'Oui' : 'Non'} → ${newRole.hoist ? 'Oui' : 'Non'}`);
    }

    // Vérifier si mentionnable
    if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(`**Mentionnable:** ${oldRole.mentionable ? 'Oui' : 'Non'} → ${newRole.mentionable ? 'Oui' : 'Non'}`);
    }

    // Vérifier l'icône
    if (oldRole.icon !== newRole.icon) {
        changes.push(`**Icône:** Modifiée`);
    }

    // Vérifier l'emoji unicode
    if (oldRole.unicodeEmoji !== newRole.unicodeEmoji) {
        const oldEmoji = oldRole.unicodeEmoji || 'Aucun';
        const newEmoji = newRole.unicodeEmoji || 'Aucun';
        changes.push(`**Emoji:** ${oldEmoji} → ${newEmoji}`);
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('✏️ Rôle Modifié')
        .setDescription(`**Rôle:** ${newRole.name} (${newRole.id})`)
        .addFields(
            { name: 'Modifications', value: changes.join('\n'), inline: false },
            { name: 'Modifié par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(newRole.guild, embed);
}

// Log de modification du serveur
export async function logGuildUpdate(oldGuild: any, newGuild: any) {
    const auditEntry = await getAuditLog(newGuild, newGuild.id, AuditLogEvent.GuildUpdate);
    
    const changes: string[] = [];
    
    if (oldGuild.name !== newGuild.name) {
        changes.push(`**Nom:** ${oldGuild.name} → ${newGuild.name}`);
    }
    
    if (oldGuild.icon !== newGuild.icon) {
        changes.push(`**Icône:** Modifiée`);
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('⚙️ Serveur Modifié')
        .setDescription(`**Serveur:** ${newGuild.name} (${newGuild.id})`)
        .addFields(
            { name: 'Modifications', value: changes.join('\n'), inline: false },
            { name: 'Modifié par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

    await sendLog(newGuild, embed);
}

// Fonction utilitaire pour obtenir le nom du type de canal
function getChannelTypeName(type: ChannelType): string {
    switch (type) {
        case ChannelType.GuildText: return 'Canal texte';
        case ChannelType.GuildVoice: return 'Canal vocal';
        case ChannelType.GuildCategory: return 'Catégorie';
        case ChannelType.GuildNews: return 'Canal d\'annonces';
        case ChannelType.GuildStageVoice: return 'Canal de scène';
        case ChannelType.GuildDirectory: return 'Répertoire';
        case ChannelType.GuildForum: return 'Forum';
        default: return 'Inconnu';
    }
} 
