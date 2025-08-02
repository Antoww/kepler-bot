import { Events, Role } from 'discord.js';
import { logRoleCreate } from '../logs/guildLogs.ts';

export const name = Events.GuildRoleCreate;
export const once = false;

export async function execute(role: Role) {
    await logRoleCreate(role);
} 
