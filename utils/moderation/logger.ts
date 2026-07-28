import { createKeplerEmbed, KEPLER_COLORS } from '../theme.ts';
import { Guild, User, TextChannel } from 'discord.js';
import { getModerationChannel } from '../../database/db.ts';
import { logger } from '../logger.ts';

export async function logModeration(
    guild: Guild,
    action: string,
    target: User,
    moderator: User,
    reason?: string,
    duration?: string
) {
    try {
        const moderationChannelId = await getModerationChannel(guild.id);

        if (!moderationChannelId) {
            return;
        }

        const channel = guild.channels.cache.get(moderationChannelId) as TextChannel;

        if (!channel) {
            return;
        }

        const embed = createKeplerEmbed()
            .setAuthor({
                name: `Action de modération: ${action}`,
                iconURL: guild.iconURL() || undefined
            })
            .setColor(getActionColor(action))
            .addFields(
                { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`, inline: true },
                { name: '🛡️ Modérateur', value: `${moderator.tag} (${moderator.id})`, inline: true },
                { name: '📝 Raison', value: reason || 'Aucune raison fournie', inline: false }
            )
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        if (duration) {
            embed.addFields({ name: '⏰ Durée', value: duration, inline: true });
        }

        await channel.send({ embeds: [embed] });
    } catch (error) {
        logger.error('Erreur envoi log modération', error, 'ModerationLogger');
    }
}

function getActionColor(action: string): number {
    switch (action.toLowerCase()) {
        case 'ban':
        case 'tempban':
            return KEPLER_COLORS.danger;
        case 'kick':
            return KEPLER_COLORS.warning;
        case 'mute':
        case 'tempmute':
            return KEPLER_COLORS.warning;
        case 'unban':
        case 'unmute':
            return KEPLER_COLORS.success;
        default:
            return KEPLER_COLORS.primary;
    }
}
