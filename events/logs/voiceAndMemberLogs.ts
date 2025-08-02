import { 
    EmbedBuilder, 
    AuditLogEvent, 
    TextChannel,
    GuildMember,
    VoiceState
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

// Log de changement de pseudo
export async function logMemberUpdate(oldMember: GuildMember, newMember: GuildMember) {
    const auditEntry = await getAuditLog(newMember.guild, newMember.id, AuditLogEvent.MemberUpdate);
    
    const changes: string[] = [];
    
    // Changement de pseudo
    if (oldMember.nickname !== newMember.nickname) {
        changes.push(`**Pseudo:** ${oldMember.nickname || oldMember.user.username} → ${newMember.nickname || newMember.user.username}`);
    }
    
    // Changement de rôles
    const oldRoles = oldMember.roles.cache.filter(role => role.id !== newMember.guild.id);
    const newRoles = newMember.roles.cache.filter(role => role.id !== newMember.guild.id);
    
    const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
    
    if (addedRoles.size > 0) {
        changes.push(`**Rôles ajoutés:** ${addedRoles.map(role => role.name).join(', ')}`);
    }
    
    if (removedRoles.size > 0) {
        changes.push(`**Rôles supprimés:** ${removedRoles.map(role => role.name).join(', ')}`);
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('✏️ Membre Modifié')
        .setDescription(`**Utilisateur:** ${newMember.user.tag} (${newMember.user.id})`)
        .addFields(
            { name: 'Modifications', value: changes.join('\n'), inline: false },
            { name: 'Modifié par', value: auditEntry?.executor ? `${auditEntry.executor.tag} (${auditEntry.executor.id})` : 'Auto/Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL({ forceStatic: false }))
        .setTimestamp();

    await sendLog(newMember.guild, embed);
}

// Log de timeout/mute
export async function logMemberTimeout(member: GuildMember, timeout: Date | null, executor?: any) {
    const embed = new EmbedBuilder()
        .setTitle(timeout ? '🔇 Membre Mis en Timeout' : '🔊 Timeout Retiré')
        .setDescription(`**Utilisateur:** ${member.user.tag} (${member.user.id})`)
        .addFields(
            { name: timeout ? 'Mis en timeout par' : 'Timeout retiré par', value: executor ? `${executor.tag} (${executor.id})` : 'Inconnu', inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setTimestamp();

    if (timeout) {
        embed.setColor('#ff6600');
        embed.addFields({
            name: 'Fin du timeout',
            value: `<t:${Math.floor(timeout.getTime() / 1000)}:F>`,
            inline: false
        });
    } else {
        embed.setColor('#00ff00');
    }

    await sendLog(member.guild, embed);
}

// Log d'activité vocale (connexion/déconnexion)
export async function logVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    if (!newState.guild) return;
    
    // Ignorer les bots
    if (newState.member?.user.bot) return;

    // Connexion à un canal vocal
    if (!oldState.channel && newState.channel) {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🔊 Connexion Vocale')
            .setDescription(`**Utilisateur:** ${newState.member?.user.tag} (${newState.member?.user.id})`)
            .addFields(
                { name: 'Canal rejoint', value: `${newState.channel.name} (${newState.channel.id})`, inline: true },
                { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(newState.member?.user.displayAvatarURL({ forceStatic: false }) || null)
            .setTimestamp();

        await sendLog(newState.guild, embed);
    }
    
    // Déconnexion d'un canal vocal
    else if (oldState.channel && !newState.channel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🔇 Déconnexion Vocale')
            .setDescription(`**Utilisateur:** ${newState.member?.user.tag} (${newState.member?.user.id})`)
            .addFields(
                { name: 'Canal quitté', value: `${oldState.channel.name} (${oldState.channel.id})`, inline: true },
                { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(newState.member?.user.displayAvatarURL({ forceStatic: false }) || null)
            .setTimestamp();

        await sendLog(newState.guild, embed);
    }
    
    // Changement de canal vocal
    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        const embed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('🔄 Changement de Canal Vocal')
            .setDescription(`**Utilisateur:** ${newState.member?.user.tag} (${newState.member?.user.id})`)
            .addFields(
                { name: 'Canal quitté', value: `${oldState.channel.name} (${oldState.channel.id})`, inline: true },
                { name: 'Canal rejoint', value: `${newState.channel.name} (${newState.channel.id})`, inline: true },
                { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(newState.member?.user.displayAvatarURL({ forceStatic: false }) || null)
            .setTimestamp();

        await sendLog(newState.guild, embed);
    }
}
