import { Events } from 'discord.js';
import { recordAutoModViolation, type AutoModRule } from '../../utils/moderation/automodService.ts';
import { logger } from '../../utils/logger.ts';

export const name = Events.AutoModerationActionExecution;
export const once = false;

export async function execute(event: {
    guildId: string;
    userId: string;
    channelId?: string;
    messageId?: string;
    ruleTriggerType: number;
    content?: string;
}) {
    const ruleByTrigger: Record<number, AutoModRule> = {
        1: 'keyword',
        3: 'spam',
        4: 'keyword',
        5: 'mentions',
        6: 'keyword'
    };
    const rule = ruleByTrigger[event.ruleTriggerType] ?? 'keyword';
    try {
        await recordAutoModViolation(
            event.guildId,
            event.userId,
            event.channelId ?? event.guildId,
            event.messageId ?? `native-${Date.now()}`,
            rule,
            'native',
            event.content ?? '',
            'native',
            false
        );
    } catch (error) {
        logger.error('Erreur journalisation AutoMod natif', error, 'AUTOMOD');
    }
}
