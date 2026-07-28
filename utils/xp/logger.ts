import {
    ChannelType,
    type Guild
} from 'discord.js';
import { supabase } from '../../database/supabase.ts';
import { createKeplerEmbed, type KeplerTone } from '../theme.ts';
import { logger } from '../logger.ts';

interface XpLogField {
    name: string;
    value: string;
    inline?: boolean;
}

export async function sendXpLog(
    guild: Guild,
    title: string,
    description: string,
    tone: KeplerTone = 'primary',
    fields: XpLogField[] = []
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('guild_xp_settings')
            .select('xp_log_channel_id')
            .eq('guild_id', guild.id)
            .maybeSingle();
        if (error) throw error;
        if (!data?.xp_log_channel_id) return false;

        const channel = await guild.channels.fetch(data.xp_log_channel_id);
        if (
            !channel ||
            (channel.type !== ChannelType.GuildText &&
                channel.type !== ChannelType.GuildAnnouncement)
        ) {
            logger.warn(`Salon de logs XP invalide sur ${guild.id}`, undefined, 'XP');
            return false;
        }

        const embed = createKeplerEmbed(tone)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: `Journal XP · ${guild.name}` });
        if (fields.length) embed.addFields(fields);
        await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
        return true;
    } catch (error) {
        logger.warn(`Impossible d’envoyer un log XP sur ${guild.id}`, error, 'XP');
        return false;
    }
}
