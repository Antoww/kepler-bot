import type { SlashCommandBuilder, ContextMenuCommandBuilder, CommandInteraction, Collection } from "npm:discord.js@^14.17.2";
import type { ReminderManager } from './managers/reminderManager.ts';
import type { InviteManager } from './managers/inviteManager.ts';
import type { ModerationManager } from './managers/moderationManager.ts';

declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, Command>;
        reminderManager?: ReminderManager;
        inviteManager?: InviteManager;
        moderationManager?: ModerationManager;
    }
}

export interface Command {
    data: SlashCommandBuilder | ContextMenuCommandBuilder;
    execute: (interaction: CommandInteraction) => Promise<void>;
}

export interface Event {
    name: string;
    once?: boolean;
    execute: (...args: any[]) => Promise<void>;
}

export type Birthdays = Record<string, Record<string, string>>;

export interface Reminder {
    userId: string;
    message: string;
    duration: number;
    timestamp: number;
}

export type Reminders = Record<string, Reminder>;

export interface Config {
    logChannel?: string;
    birthdayChannel?: string;
}

export type Configs = Record<string, Config>;
