import { Events, Invite } from 'discord.js';
import { logInviteDelete } from '../logs/miscLogs.ts';

export const name = Events.InviteDelete;
export const once = false;

export async function execute(invite: Invite) {
    await logInviteDelete(invite);
}
