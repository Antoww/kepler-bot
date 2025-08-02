import { 
    EmbedBuilder, 
    AuditLogEvent, 
    TextChannel,
    GuildMember,
    User,
    GuildBan
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

// Log de bannissement
export async function logMemberBan(ban: GuildBan) {
    const auditEntry = await getAuditLog(ban.guild, ban.user.id, AuditLogEvent.MemberBanAdd);
    
    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🔨 Membre Banni')
        .setDescription(`**Utilisateur:** ${ban.user.tag} (${ban.user.id})`)
        .addFields(
            { name: 'Banni par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(ban.user.displayAvatarURL({ forceStatic: false }))
        .setTimestamp();

    // Ajouter la raison du ban si disponible
    if (ban.reason) {
        embed.addFields({
            name: 'Raison',
            value: ban.reason.length > 1024 ? ban.reason.substring(0, 1021) + '...' : ban.reason,
            inline: false
        });
    } else if (auditEntry?.reason) {
        embed.addFields({
            name: 'Raison',
            value: auditEntry.reason.length > 1024 ? auditEntry.reason.substring(0, 1021) + '...' : auditEntry.reason,
            inline: false
        });
    }

    await sendLog(ban.guild, embed);
}

// Log de débannissement
export async function logMemberUnban(ban: GuildBan) {
    const auditEntry = await getAuditLog(ban.guild, ban.user.id, AuditLogEvent.MemberBanRemove);
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Membre Débanni')
        .setDescription(`**Utilisateur:** ${ban.user.tag} (${ban.user.id})`)
        .addFields(
            { name: 'Débanni par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(ban.user.displayAvatarURL({ forceStatic: false }))
        .setTimestamp();

    // Ajouter la raison si disponible
    if (auditEntry?.reason) {
        embed.addFields({
            name: 'Raison',
            value: auditEntry.reason.length > 1024 ? auditEntry.reason.substring(0, 1021) + '...' : auditEntry.reason,
            inline: false
        });
    }

    await sendLog(ban.guild, embed);
}

// Log de kick (via audit logs)
export async function logMemberKick(member: GuildMember) {
    const auditEntry = await getAuditLog(member.guild, member.id, AuditLogEvent.MemberKick);
    
    if (!auditEntry) return; // Pas de kick détecté dans les audit logs
    
    const embed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle('👢 Membre Exclu (Kick)')
        .setDescription(`**Utilisateur:** ${member.user.tag} (${member.user.id})`)
        .addFields(
            { name: 'Exclu par', value: auditEntry.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setTimestamp();

    // Ajouter la raison si disponible
    if (auditEntry.reason) {
        embed.addFields({
            name: 'Raison',
            value: auditEntry.reason.length > 1024 ? auditEntry.reason.substring(0, 1021) + '...' : auditEntry.reason,
            inline: false
        });
    }

    await sendLog(member.guild, embed);
}

// Log d'arrivée de membre
export async function logMemberJoin(member: GuildMember) {
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('📥 Membre Rejoint')
        .setDescription(`**Utilisateur:** ${member.user.tag} (${member.user.id})`)
        .addFields(
            { name: 'Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
            { name: 'Rejoint le', value: `<t:${Math.floor((member.joinedTimestamp || Date.now()) / 1000)}:F>`, inline: true },
            { name: 'Nombre de membres', value: member.guild.memberCount.toString(), inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setTimestamp();

    // Vérifier si le compte est récent (moins de 7 jours)
    const accountAge = Date.now() - member.user.createdTimestamp;
    const dayInMs = 24 * 60 * 60 * 1000;
    if (accountAge < 7 * dayInMs) {
        embed.addFields({
            name: '⚠️ Attention',
            value: 'Compte récent (moins de 7 jours)',
            inline: false
        });
        embed.setColor('#ffaa00');
    }

    await sendLog(member.guild, embed);
}

// Log de départ de membre
export async function logMemberLeave(member: GuildMember) {
    // Vérifier d'abord si c'est un kick
    setTimeout(async () => {
        const auditEntry = await getAuditLog(member.guild, member.id, AuditLogEvent.MemberKick);
        
        // Si c'est un kick récent (moins de 5 secondes), on utilisera logMemberKick
        if (auditEntry && (Date.now() - auditEntry.createdTimestamp) < 5000) {
            await logMemberKick(member);
            return;
        }

        // Sinon, c'est un départ volontaire
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('📤 Membre Parti')
            .setDescription(`**Utilisateur:** ${member.user.tag} (${member.user.id})`)
            .addFields(
                { name: 'Rejoint le', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Inconnu', inline: true },
                { name: 'Parti le', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: 'Nombre de membres', value: member.guild.memberCount.toString(), inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        // Ajouter les rôles qu'il avait
        if (member.roles.cache.size > 1) { // Plus de 1 car @everyone est toujours présent
            const roles = member.roles.cache
                .filter(role => role.id !== member.guild.id) // Exclure @everyone
                .map(role => role.name)
                .join(', ');
            
            if (roles.length > 0) {
                embed.addFields({
                    name: 'Rôles',
                    value: roles.length > 1024 ? roles.substring(0, 1021) + '...' : roles,
                    inline: false
                });
            }
        }

        await sendLog(member.guild, embed);
    }, 1000); // Attendre 1 seconde pour vérifier les audit logs
}
