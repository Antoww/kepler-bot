import { Events, VoiceState } from 'discord.js';
import { logVoiceStateUpdate } from '../logs/voiceAndMemberLogs.ts';

export const name = Events.VoiceStateUpdate;
export const once = false;

export async function execute(oldState: VoiceState, newState: VoiceState) {
    await logVoiceStateUpdate(oldState, newState);
}
