import type { SlashCommandBuilder, CommandInteraction, Collection } from "npm:discord.js@^14.17.2";

declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, Command>;
    }
}

export interface Command {
    data: SlashCommandBuilder;
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