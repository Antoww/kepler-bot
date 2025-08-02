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

// Log de création de canal
export async function logChannelCreate(channel: GuildChannel) {
    if (!channel.guild) return;

    const auditEntry = await getAuditLog(channel.guild, channel.id, AuditLogEvent.ChannelCreate);
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('📝 Canal Créé')
        .setDescription(`**Canal:** ${channel.name} (${channel.id})`)
        .addFields(
            { name: 'Type', value: getChannelTypeName(channel.type), inline: true },
            { name: 'Créé par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
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