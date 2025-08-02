import { Events, Role } from 'discord.js';
import { logRoleDelete } from '../logs/guildLogs.ts';

export const name = Events.GuildRoleDelete;
export const once = false;

export async function execute(role: Role) {
    await logRoleDelete(role);
} 
