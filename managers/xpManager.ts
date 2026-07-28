import type { Client } from 'discord.js';
import { supabase } from '../database/supabase.ts';
import { sendXpLog } from '../utils/xpLogger.ts';
import { logger } from '../utils/logger.ts';

const CHECK_INTERVAL = 60_000;

export class XpManager {
    private interval: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly client: Client) {}

    start(): void {
        void this.checkEndedBoosts();
        this.interval = setInterval(() => void this.checkEndedBoosts(), CHECK_INTERVAL);
        logger.manager('XpManager', 'démarré');
    }

    stop(): void {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    private async checkEndedBoosts(): Promise<void> {
        const now = new Date();
        const { data, error } = await supabase
            .from('guild_xp_settings')
            .select('guild_id, boost_multiplier, boost_starts_at, boost_ends_at, boost_end_notified_at')
            .not('boost_ends_at', 'is', null)
            .lte('boost_ends_at', now.toISOString());
        if (error) {
            logger.error('Vérification des fins de boost impossible', error, 'XP');
            return;
        }

        for (const settings of data ?? []) {
            const endTime = new Date(settings.boost_ends_at).getTime();
            const notifiedTime = settings.boost_end_notified_at
                ? new Date(settings.boost_end_notified_at).getTime()
                : 0;
            if (notifiedTime >= endTime) continue;

            const guild = this.client.guilds.cache.get(settings.guild_id);
            if (!guild) continue;
            const sent = await sendXpLog(
                guild,
                'Boost XP terminé',
                `La période de boost **×${Number(settings.boost_multiplier)}** est terminée.`,
                'neutral',
                [
                    {
                        name: 'Période',
                        value: `<t:${Math.floor(new Date(settings.boost_starts_at).getTime() / 1000)}:f> → <t:${Math.floor(endTime / 1000)}:f>`,
                        inline: false
                    }
                ]
            );
            if (!sent) continue;

            const { error: updateError } = await supabase
                .from('guild_xp_settings')
                .update({ boost_end_notified_at: now.toISOString() })
                .eq('guild_id', settings.guild_id)
                .eq('boost_ends_at', settings.boost_ends_at);
            if (updateError) logger.error('État de fin de boost non enregistré', updateError, 'XP');
        }
    }
}
