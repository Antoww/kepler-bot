import type { SlashCommandBuilder, BaseInteraction, Collection } from "npm:discord.js@^14.17.2";

declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, Command>;
    }
}

export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: BaseInteraction) => Promise<void>;
}

export interface Event {
    name: string;
    once?: boolean;
    execute: (...args: any[]) => Promise<void>;
}

export type Birthdays = Record<string, string>;