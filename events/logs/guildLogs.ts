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
    const client = channel.client;
    
    const fields: any[] = [
        { name: '📋 Type', value: getChannelTypeName(channel.type), inline: true },
        { name: '🆔 ID', value: `\`${channel.id}\``, inline: true },
        { name: '📅 Date de création', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    // Vérifier si le canal a une catégorie parent
    if (channel.parent) {
        fields.push({ name: '📁 Catégorie', value: channel.parent.name, inline: true });
    }

    // Ajouter des informations supplémentaires selon le type de canal
    if (channel.isTextBased()) {
        const textChannel = channel as TextChannel;
        
        if (textChannel.topic) {
            const topicTrunc = textChannel.topic.length > 200 ? textChannel.topic.substring(0, 200) + '...' : textChannel.topic;
            fields.push({ name: '📝 Description', value: topicTrunc, inline: false });
        }
        
        if (textChannel.rateLimitPerUser > 0) {
            fields.push({ name: '⏱️ Mode lent', value: `${textChannel.rateLimitPerUser}s`, inline: true });
        }
        
        if (textChannel.nsfw) {
            fields.push({ name: '🔞 NSFW', value: 'Activé', inline: true });
        }
    }

    // Vérifier les permissions personnalisées
    const permOverwrites = channel.permissionOverwrites?.cache;
    if (permOverwrites && permOverwrites.size > 0) {
        fields.push({ name: '🔐 Permissions', value: `${permOverwrites.size} permission(s) personnalisée(s)`, inline: true });
    }

    if (auditEntry?.executor) {
        fields.push({ name: '👤 Créé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#57F287')
        .setTitle('📝 Canal Créé')
        .setDescription(`### ${channel.name}\n> Un nouveau canal a été créé sur le serveur.`)
        .addFields(fields)
        .setThumbnail(channel.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Serveur`,
            iconURL: channel.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(channel.guild, embed);
}

// Log de suppression de canal
export async function logChannelDelete(channel: GuildChannel) {
    if (!channel.guild) return;

    const auditEntry = await getAuditLog(channel.guild, channel.id, AuditLogEvent.ChannelDelete);
    const client = channel.client;
    
    const fields: any[] = [
        { name: '📋 Type', value: getChannelTypeName(channel.type), inline: true },
        { name: '🆔 ID', value: `\`${channel.id}\``, inline: true },
        { name: '📅 Date de suppression', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '👤 Supprimé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    if (auditEntry?.reason) {
        fields.push({ name: '📄 Raison', value: auditEntry.reason, inline: false });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#ED4245')
        .setTitle('🗑️ Canal Supprimé')
        .setDescription(`### ${channel.name}\n> Un canal a été supprimé du serveur.`)
        .addFields(fields)
        .setThumbnail(channel.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Serveur`,
            iconURL: channel.guild.iconURL({ forceStatic: false }) || undefined
        })
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

    const client = newChannel.client;
    const fields: any[] = [
        { name: '📋 Type', value: getChannelTypeName(newChannel.type), inline: true },
        { name: '🆔 ID', value: `\`${newChannel.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        { name: '🔄 Modifications', value: changes.join('\n'), inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '👤 Modifié par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#FEE75C')
        .setTitle('✏️ Canal Modifié')
        .setDescription(`### ${newChannel.name}\n> Le canal a été modifié avec **${changes.length}** changement(s).`)
        .addFields(fields)
        .setThumbnail(newChannel.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Serveur • ${changes.length} modification(s)`,
            iconURL: newChannel.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(newChannel.guild, embed);
}

// Log de création de rôle
export async function logRoleCreate(role: Role) {
    const auditEntry = await getAuditLog(role.guild, role.id, AuditLogEvent.RoleCreate);
    const client = role.client;
    
    const fields: any[] = [
        { name: '🎨 Couleur', value: role.hexColor, inline: true },
        { name: '🆔 ID', value: `\`${role.id}\``, inline: true },
        { name: '📅 Date de création', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    const perms = role.permissions.toArray();
    if (perms.length > 0) {
        const permsList = perms.slice(0, 8).join(', ');
        const morePerms = perms.length > 8 ? ` (+${perms.length - 8} autres)` : '';
        fields.push({ name: '🔐 Permissions', value: permsList + morePerms, inline: false });
    }

    if (role.hoist) {
        fields.push({ name: '📌 Affichage', value: 'Affiché séparément', inline: true });
    }

    if (role.mentionable) {
        fields.push({ name: '📢 Mentionnable', value: 'Oui', inline: true });
    }

    if (auditEntry?.executor) {
        fields.push({ name: '👤 Créé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(role.hexColor || '#57F287')
        .setTitle('🎭 Rôle Créé')
        .setDescription(`### ${role.name}\n> Un nouveau rôle a été créé sur le serveur.`)
        .addFields(fields)
        .setThumbnail(role.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Serveur`,
            iconURL: role.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(role.guild, embed);
}

// Log de suppression de rôle
export async function logRoleDelete(role: Role) {
    const auditEntry = await getAuditLog(role.guild, role.id, AuditLogEvent.RoleDelete);
    const client = role.client;
    
    const fields: any[] = [
        { name: '🎨 Couleur', value: role.hexColor, inline: true },
        { name: '🆔 ID', value: `\`${role.id}\``, inline: true },
        { name: '📅 Date de suppression', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '👤 Supprimé par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    if (auditEntry?.reason) {
        fields.push({ name: '📄 Raison', value: auditEntry.reason, inline: false });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#ED4245')
        .setTitle('🗑️ Rôle Supprimé')
        .setDescription(`### ${role.name}\n> Un rôle a été supprimé du serveur.`)
        .addFields(fields)
        .setThumbnail(role.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Serveur`,
            iconURL: role.guild.iconURL({ forceStatic: false }) || undefined
        })
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

    const client = newRole.client;
    const fields: any[] = [
        { name: '🎨 Couleur', value: newRole.hexColor, inline: true },
        { name: '🆔 ID', value: `\`${newRole.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        { name: '🔄 Modifications', value: changes.join('\n'), inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '👤 Modifié par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(newRole.hexColor || '#FEE75C')
        .setTitle('✏️ Rôle Modifié')
        .setDescription(`### ${newRole.name}\n> Le rôle a été modifié avec **${changes.length}** changement(s).`)
        .addFields(fields)
        .setThumbnail(newRole.guild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Serveur • ${changes.length} modification(s)`,
            iconURL: newRole.guild.iconURL({ forceStatic: false }) || undefined
        })
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

    const client = newGuild.client;
    const fields: any[] = [
        { name: '🆔 ID', value: `\`${newGuild.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '🔄 Modifications', value: changes.join('\n'), inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '👤 Modifié par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#FEE75C')
        .setTitle('⚙️ Serveur Modifié')
        .setDescription(`### ${newGuild.name}\n> Le serveur a été modifié avec **${changes.length}** changement(s).`)
        .addFields(fields)
        .setThumbnail(newGuild.iconURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Serveur • ${changes.length} modification(s)`,
            iconURL: newGuild.iconURL({ forceStatic: false }) || undefined
        })
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
