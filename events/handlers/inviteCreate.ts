import { Events, Invite } from 'discord.js';
import { logInviteCreate } from '../logs/miscLogs.ts';

export const name = Events.InviteCreate;
export const once = false;

export async function execute(invite: Invite) {
    await logInviteCreate(invite);
}
