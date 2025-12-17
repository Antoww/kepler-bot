import { 
    EmbedBuilder, 
    AuditLogEvent, 
    TextChannel,
    GuildMember,
    User,
    GuildBan
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

// Log de bannissement
export async function logMemberBan(ban: GuildBan) {
    const auditEntry = await getAuditLog(ban.guild, ban.user.id, AuditLogEvent.MemberBanAdd);
    const client = ban.client;
    
    const fields: any[] = [
        { name: '👤 Utilisateur', value: `${ban.user.tag}\n\`${ban.user.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '🔨 Banni par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: false });
    }

    // Ajouter la raison du ban si disponible
    const reason = ban.reason || auditEntry?.reason;
    if (reason) {
        fields.push({
            name: '📄 Raison',
            value: reason.length > 1024 ? reason.substring(0, 1021) + '...' : reason,
            inline: false
        });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#ED4245')
        .setTitle('🔨 Membre Banni')
        .setDescription(`### ${ban.user.tag}\n> Un membre a été banni du serveur.`)
        .addFields(fields)
        .setThumbnail(ban.user.displayAvatarURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Modération`,
            iconURL: ban.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(ban.guild, embed);
}

// Log de débannissement
export async function logMemberUnban(ban: GuildBan) {
    const auditEntry = await getAuditLog(ban.guild, ban.user.id, AuditLogEvent.MemberBanRemove);
    const client = ban.client;
    
    const fields: any[] = [
        { name: '👤 Utilisateur', value: `${ban.user.tag}\n\`${ban.user.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '✅ Débanni par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: false });
    }

    // Ajouter la raison si disponible
    if (auditEntry?.reason) {
        fields.push({
            name: '📄 Raison',
            value: auditEntry.reason.length > 1024 ? auditEntry.reason.substring(0, 1021) + '...' : auditEntry.reason,
            inline: false
        });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#57F287')
        .setTitle('✅ Membre Débanni')
        .setDescription(`### ${ban.user.tag}\n> Un membre a été débanni et peut rejoindre le serveur.`)
        .addFields(fields)
        .setThumbnail(ban.user.displayAvatarURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Modération`,
            iconURL: ban.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(ban.guild, embed);
}

// Log de kick (via audit logs)
export async function logMemberKick(member: GuildMember) {
    const auditEntry = await getAuditLog(member.guild, member.id, AuditLogEvent.MemberKick);
    
    if (!auditEntry) return; // Pas de kick détecté dans les audit logs
    
    const client = member.client;
    const fields: any[] = [
        { name: '👤 Utilisateur', value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    ];

    if (auditEntry.executor) {
        fields.push({ name: '👢 Exclu par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: false });
    }

    // Ajouter la raison si disponible
    if (auditEntry.reason) {
        fields.push({
            name: '📄 Raison',
            value: auditEntry.reason.length > 1024 ? auditEntry.reason.substring(0, 1021) + '...' : auditEntry.reason,
            inline: false
        });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor('#F26522')
        .setTitle('👢 Membre Exclu (Kick)')
        .setDescription(`### ${member.user.tag}\n> Un membre a été exclu du serveur.`)
        .addFields(fields)
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Modération`,
            iconURL: member.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(member.guild, embed);
}

// Log d'arrivée de membre
export async function logMemberJoin(member: GuildMember) {
    const client = member.client;
    const accountAge = Date.now() - member.user.createdTimestamp;
    const dayInMs = 24 * 60 * 60 * 1000;
    const isNewAccount = accountAge < 7 * dayInMs;

    const fields: any[] = [
        { name: '👤 Utilisateur', value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
        { name: '👥 Membres', value: member.guild.memberCount.toString(), inline: true },
        { name: '📅 Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false },
        { name: '📍 Rejoint le', value: `<t:${Math.floor((member.joinedTimestamp || Date.now()) / 1000)}:F>`, inline: false }
    ];

    // Vérifier si le compte est récent (moins de 7 jours)
    if (isNewAccount) {
        const days = Math.floor(accountAge / dayInMs);
        fields.push({
            name: '⚠️ Alerte',
            value: `Compte récent créé il y a ${days} jour(s)`,
            inline: false
        });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(isNewAccount ? '#FEE75C' : '#57F287')
        .setTitle('📥 Membre Rejoint')
        .setDescription(`### ${member.user.tag}\n> Un nouveau membre a rejoint le serveur !`)
        .addFields(fields)
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setFooter({ 
            text: `Logs Membres • Membre #${member.guild.memberCount}`,
            iconURL: member.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

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
        const client = member.client;
        const joinedAt = member.joinedTimestamp ? member.joinedTimestamp : null;
        const timeOnServer = joinedAt ? Date.now() - joinedAt : null;

        const fields: any[] = [
            { name: '👤 Utilisateur', value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
            { name: '👥 Membres restants', value: member.guild.memberCount.toString(), inline: true },
            { name: '📍 Avait rejoint', value: joinedAt ? `<t:${Math.floor(joinedAt / 1000)}:R>` : 'Inconnu', inline: false },
            { name: '📤 Parti le', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        ];

        if (timeOnServer) {
            const days = Math.floor(timeOnServer / (24 * 60 * 60 * 1000));
            fields.push({
                name: '⏱️ Temps sur le serveur',
                value: days > 0 ? `${days} jour(s)` : 'Moins d\'un jour',
                inline: true
            });
        }

        // Ajouter les rôles qu'il avait
        if (member.roles.cache.size > 1) {
            const roles = member.roles.cache
                .filter(role => role.id !== member.guild.id)
                .map(role => `\`${role.name}\``)
                .slice(0, 10)
                .join(', ');
            
            if (roles.length > 0) {
                const more = member.roles.cache.size - 1 > 10 ? ` (+${member.roles.cache.size - 11})` : '';
                fields.push({
                    name: '🎭 Rôles',
                    value: roles + more,
                    inline: false
                });
            }
        }

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: 'Kepler Bot - Système de Logs',
                iconURL: client.user?.displayAvatarURL({ forceStatic: false })
            })
            .setColor('#ED4245')
            .setTitle('📤 Membre Parti')
            .setDescription(`### ${member.user.tag}\n> Un membre a quitté le serveur.`)
            .addFields(fields)
            .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
            .setFooter({ 
                text: `Logs Membres`,
                iconURL: member.guild.iconURL({ forceStatic: false }) || undefined
            })
            .setTimestamp();

        await sendLog(member.guild, embed);
    }, 1000); // Attendre 1 seconde pour vérifier les audit logs
}
