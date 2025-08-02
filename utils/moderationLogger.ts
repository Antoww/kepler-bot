import { EmbedBuilder, Guild, User, TextChannel } from 'discord.js';
import { getModerationChannel } from '../../database/db.ts';

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
            console.log('Aucun canal de modération configuré pour ce serveur');
            return;
        }

        const channel = guild.channels.cache.get(moderationChannelId) as TextChannel;
        
        if (!channel) {
            console.log('Canal de modération introuvable');
            return;
        }

        const embed = new EmbedBuilder()
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
        console.error('Erreur lors de l\'envoi du log de modération:', error);
    }
}

function getActionColor(action: string): number {
    switch (action.toLowerCase()) {
        case 'ban':
        case 'tempban':
            return 0xff0000; // Rouge
        case 'kick':
            return 0xff9900; // Orange
        case 'mute':
        case 'tempmute':
            return 0xffff00; // Jaune
        case 'unban':
        case 'unmute':
            return 0x00ff00; // Vert
        default:
            return 0x0099ff; // Bleu
    }
}
