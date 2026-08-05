import {
    ChannelType,
    ContainerBuilder,
    MessageFlags,
    TextDisplayBuilder,
    type Guild
} from 'discord.js';
import { supabase } from '../../database/supabase.ts';
import { KEPLER_COLORS, type KeplerTone } from '../theme.ts';
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

        const details = fields.length
            ? `\n\n${fields.map(field => `**${field.name}** — ${field.value}`).join('\n')}`
            : '';
        const timestamp = Math.floor(Date.now() / 1000);
        const container = new ContainerBuilder()
            .setAccentColor(KEPLER_COLORS[tone])
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# KEPLER • JOURNAL XP\n## ${title}\n${description}${details}`
                ),
                new TextDisplayBuilder().setContent(
                    `-# Journal XP • ${guild.name} • <t:${timestamp}:R>`
                )
            );
        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { parse: [] }
        });
        return true;
    } catch (error) {
        logger.warn(`Impossible d’envoyer un log XP sur ${guild.id}`, error, 'XP');
        return false;
    }
}
