import {
    ChannelType,
    Client,
    type TextBasedChannel
} from 'discord.js';
import { createKeplerEmbed } from './theme.ts';

const KEPLER_ERROR_CHANNEL_ID = '1531755657269739570';
const KEPLER_BETA_ERROR_CHANNEL_ID = '1531755978696167525';
const MAX_DESCRIPTION_LENGTH = 4000;

type ReportLevel = 'error' | 'warn';

function stringify(value: unknown): string {
    if (value instanceof Error) {
        return value.stack ?? `${value.name}: ${value.message}`;
    }

    if (typeof value === 'string') return value;

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function truncate(value: string): string {
    if (value.length <= MAX_DESCRIPTION_LENGTH) return value;
    return `${value.slice(0, MAX_DESCRIPTION_LENGTH - 20)}\n… (message tronqué)`;
}

function getErrorChannelId(client: Client): string {
    const configuredChannelId = Deno.env.get('ERROR_CHANNEL_ID')?.trim();
    if (configuredChannelId) return configuredChannelId;

    const isBeta = client.user?.username.toLowerCase().includes('beta') ?? false;
    return isBeta ? KEPLER_BETA_ERROR_CHANNEL_ID : KEPLER_ERROR_CHANNEL_ID;
}

async function getErrorChannel(client: Client): Promise<TextBasedChannel | null> {
    const channel = await client.channels.fetch(getErrorChannelId(client));

    if (!channel?.isTextBased() || channel.type === ChannelType.DM) {
        return null;
    }

    return channel;
}

/**
 * Transmet les erreurs console et les rejets globaux vers le serveur support.
 * La console d'origine reste toujours active, même si Discord est indisponible.
 */
export function initializeDiscordErrorReporter(client: Client): void {
    const originalConsoleError = console.error.bind(console);
    const originalConsoleWarn = console.warn.bind(console);

    const report = async (
        level: ReportLevel,
        source: string,
        values: unknown[]
    ): Promise<void> => {
        if (!client.isReady()) return;

        try {
            const channel = await getErrorChannel(client);
            if (!channel) {
                originalConsoleError('[ErrorReporter] Le salon configuré n’est pas textuel.');
                return;
            }

            const description = truncate(values.map(stringify).join('\n'));
            const isError = level === 'error';
            const embed = createKeplerEmbed(isError ? 'danger' : 'warning')
                .setTitle(`${isError ? 'Erreur' : 'Avertissement'} ${client.user.username}`)
                .setDescription(`\`\`\`\n${description.replaceAll('```', '`\u200b``')}\n\`\`\``)
                .addFields({ name: 'Source', value: source, inline: true });

            await channel.send({ embeds: [embed] });
        } catch (error) {
            originalConsoleError('[ErrorReporter] Échec de l’envoi vers Discord:', error);
        }
    };

    console.error = (...values: unknown[]) => {
        originalConsoleError(...values);
        void report('error', 'console.error', values);
    };

    console.warn = (...values: unknown[]) => {
        originalConsoleWarn(...values);
        void report('warn', 'console.warn', values);
    };

    globalThis.addEventListener('error', (event) => {
        void report('error', 'Erreur globale', [event.error ?? event.message]);
    });

    globalThis.addEventListener('unhandledrejection', (event) => {
        void report('error', 'Promesse non gérée', [event.reason]);
    });
}

export function sendDiscordErrorReporterTest(): void {
    console.warn(
        '[SIMULATION] Avertissement de test',
        { module: 'ErrorReporter', status: 'warning' }
    );
    console.error(
        '[SIMULATION] Erreur de test',
        new Error('Ceci est une erreur simulée, aucune action n’est nécessaire.')
    );
}
