import { createKeplerEmbed, KEPLER_COLORS } from '../../utils/theme.ts';
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
    const client = newMember.client;

    const changes: string[] = [];

    // Changement de pseudo
    if (oldMember.nickname !== newMember.nickname) {
        const oldNick = oldMember.nickname || oldMember.user.username;
        const newNick = newMember.nickname || newMember.user.username;
        changes.push(`**Pseudo:** ${oldNick} → ${newNick}`);
    }

    // Changement de rôles
    const oldRoles = oldMember.roles.cache.filter(role => role.id !== newMember.guild.id);
    const newRoles = newMember.roles.cache.filter(role => role.id !== newMember.guild.id);

    const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

    if (addedRoles.size > 0) {
        const roleList = addedRoles.map(role => `\`${role.name}\``).join(', ');
        changes.push(`**Rôles ajoutés:** ${roleList}`);
    }

    if (removedRoles.size > 0) {
        const roleList = removedRoles.map(role => `\`${role.name}\``).join(', ');
        changes.push(`**Rôles retirés:** ${roleList}`);
    }

    if (changes.length === 0) return;

    const fields: any[] = [
        { name: '👤 Utilisateur', value: `${newMember.user.tag}\n\`${newMember.user.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '🔄 Modifications', value: changes.join('\n'), inline: false }
    ];

    if (auditEntry?.executor) {
        fields.push({ name: '👤 Modifié par', value: `${auditEntry.executor.tag}\n\`${auditEntry.executor.id}\``, inline: true });
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.warning)
        .setTitle('✏️ Membre Modifié')
        .setDescription(`### ${newMember.user.tag}\n> Le profil du membre a été modifié avec **${changes.length}** changement(s).`)
        .addFields(fields)
        .setThumbnail(newMember.user.displayAvatarURL({ forceStatic: false }))
        .setFooter({
            text: `Logs Membres • ${changes.length} modification(s)`,
            iconURL: newMember.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(newMember.guild, embed);
}

// Log de timeout/mute
export async function logMemberTimeout(member: GuildMember, timeout: Date | null, executor?: any) {
    const client = member.client;
    const isTimeout = timeout !== null;

    const fields: any[] = [
        { name: '👤 Utilisateur', value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
    ];

    if (executor) {
        fields.push({ name: isTimeout ? '🔇 Mis en timeout par' : '🔊 Timeout retiré par', value: `${executor.tag}\n\`${executor.id}\``, inline: false });
    }

    if (timeout) {
        fields.push({
            name: '⏳ Fin du timeout',
            value: `<t:${Math.floor(timeout.getTime() / 1000)}:F> (<t:${Math.floor(timeout.getTime() / 1000)}:R>)`,
            inline: false
        });
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: 'Kepler Bot - Système de Logs',
            iconURL: client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(isTimeout ? KEPLER_COLORS.warning : KEPLER_COLORS.success)
        .setTitle(isTimeout ? '🔇 Membre Mis en Timeout' : '🔊 Timeout Retiré')
        .setDescription(`### ${member.user.tag}\n> ${isTimeout ? 'Un membre a été mis en timeout.' : 'Le timeout d\'un membre a été retiré.'}`)
        .addFields(fields)
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setFooter({
            text: `Logs Modération`,
            iconURL: member.guild.iconURL({ forceStatic: false }) || undefined
        })
        .setTimestamp();

    await sendLog(member.guild, embed);
}

// Log d'activité vocale (connexion/déconnexion)
export async function logVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    if (!newState.guild) return;

    // Ignorer les bots
    if (newState.member?.user.bot) return;

    // Connexion à un canal vocal
    if (!oldState.channel && newState.channel) {
        const client = newState.client;
        const member = newState.member;
        if (!member) return;

        const fields: any[] = [
            { name: '👤 Utilisateur', value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
            { name: '🔊 Canal', value: `${newState.channel.name}\n\`${newState.channel.id}\``, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        ];

        const embed = createKeplerEmbed()
            .setAuthor({
                name: 'Kepler Bot - Système de Logs',
                iconURL: client.user?.displayAvatarURL({ forceStatic: false })
            })
            .setColor(KEPLER_COLORS.success)
            .setTitle('🔊 Connexion Vocale')
            .setDescription(`### ${member.user.tag}\n> S'est connecté au salon vocal **${newState.channel.name}**.`)
            .addFields(fields)
            .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
            .setFooter({
                text: `Logs Vocal`,
                iconURL: newState.guild.iconURL({ forceStatic: false }) || undefined
            })
            .setTimestamp();

        await sendLog(newState.guild, embed);
    }

    // Déconnexion d'un canal vocal
    else if (oldState.channel && !newState.channel) {
        const client = newState.client;
        const member = newState.member;
        if (!member) return;

        const fields: any[] = [
            { name: '👤 Utilisateur', value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
            { name: '🔇 Canal', value: `${oldState.channel.name}\n\`${oldState.channel.id}\``, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        ];

        const embed = createKeplerEmbed()
            .setAuthor({
                name: 'Kepler Bot - Système de Logs',
                iconURL: client.user?.displayAvatarURL({ forceStatic: false })
            })
            .setColor(KEPLER_COLORS.danger)
            .setTitle('🔇 Déconnexion Vocale')
            .setDescription(`### ${member.user.tag}\n> S'est déconnecté du salon vocal **${oldState.channel.name}**.`)
            .addFields(fields)
            .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
            .setFooter({
                text: `Logs Vocal`,
                iconURL: newState.guild.iconURL({ forceStatic: false }) || undefined
            })
            .setTimestamp();

        await sendLog(newState.guild, embed);
    }

    // Changement de canal vocal
    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        const client = newState.client;
        const member = newState.member;
        if (!member) return;

        const fields: any[] = [
            { name: '👤 Utilisateur', value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '📤 Canal quitté', value: `${oldState.channel.name}\n\`${oldState.channel.id}\``, inline: true },
            { name: '📥 Canal rejoint', value: `${newState.channel.name}\n\`${newState.channel.id}\``, inline: true }
        ];

        const embed = createKeplerEmbed()
            .setAuthor({
                name: 'Kepler Bot - Système de Logs',
                iconURL: client.user?.displayAvatarURL({ forceStatic: false })
            })
            .setColor(KEPLER_COLORS.warning)
            .setTitle('🔄 Changement de Canal Vocal')
            .setDescription(`### ${member.user.tag}\n> A changé de salon vocal : **${oldState.channel.name}** → **${newState.channel.name}**.`)
            .addFields(fields)
            .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
            .setFooter({
                text: `Logs Vocal`,
                iconURL: newState.guild.iconURL({ forceStatic: false }) || undefined
            })
            .setTimestamp();

        await sendLog(newState.guild, embed);
    }
}
