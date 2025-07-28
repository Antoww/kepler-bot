import { Events, Role } from 'discord.js';
import { logRoleUpdate } from './guildLogs.ts';

export const name = Events.GuildRoleUpdate;
export const once = false;

export async function execute(oldRole: Role, newRole: Role) {
    await logRoleUpdate(oldRole, newRole);
} 