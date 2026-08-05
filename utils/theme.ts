import { EmbedBuilder, type User } from 'discord.js';

const KEPLER_AUTHOR_NAME = 'Kepler';
let keplerAuthorIconURL: string | undefined;

/**
 * Identité visuelle Kepler
 *
 * Bleu orbital : couleur de marque issue du bandeau et du satellite.
 * Graphite / blanc lunaire : fonds et textes inspirés de l'espace.
 * Vert signal : état positif, à réserver aux confirmations.
 */
export const KEPLER_COLORS = {
    primary: 0x5F91C4,
    secondary: 0x3F6FA3,
    success: 0x49B675,
    warning: 0xF2C94C,
    danger: 0xE05252,
    accent: 0x78AEE8,
    highlight: 0xA9C9EA,
    neutral: 0x7F8C9D
} as const;

export type KeplerTone = keyof typeof KEPLER_COLORS;

export const KEPLER_HEX = {
    orbitalBlue: '#5F91C4',
    deepBlue: '#3F6FA3',
    signalBlue: '#78AEE8',
    lunarWhite: '#E7EBF0',
    silver: '#AAB4C0',
    muted: '#7F8C9D',
    graphite: '#121417',
    panel: '#1A1E23',
    panelRaised: '#222830',
    border: '#33404E',
    success: '#49B675',
    warning: '#F2C94C',
    danger: '#E05252'
} as const;

export const KEPLER_CHART_COLORS = {
    messages: KEPLER_HEX.orbitalBlue,
    commands: KEPLER_HEX.warning,
    members: KEPLER_HEX.deepBlue,
    channels: KEPLER_HEX.success,
    users: KEPLER_HEX.warning,
    joins: KEPLER_HEX.success,
    leaves: KEPLER_HEX.danger,
    neutral: KEPLER_HEX.silver
} as const;

export const KEPLER_MESSAGES = {
    guildOnly: '❌ Cette commande est uniquement disponible sur un serveur.',
    administratorOnly: '❌ Cette action est réservée aux administrateurs.',
    invalidUser: '❌ L’utilisateur sélectionné est invalide.',
    invalidChannel: '❌ Le salon sélectionné est invalide.',
    invalidRole: '❌ Le rôle sélectionné est invalide.',
    unauthorizedComponent: '❌ Vous ne pouvez pas utiliser ce composant.',
    unknownSubcommand: '❌ Cette sous-commande n’est pas reconnue.',
    unexpectedError: '❌ Une erreur inattendue est survenue. Réessayez dans quelques instants.',
    noData: 'ℹ️ Aucune donnée disponible pour cette période.'
} as const;

/**
 * Initialise l'identité commune des embeds avec l'avatar actuel du bot.
 * Le nom reste fixe afin de préserver la marque, même si le compte Discord
 * est renommé temporairement.
 */
export function configureKeplerEmbedIdentity(user: User): void {
    keplerAuthorIconURL = user.displayAvatarURL({ forceStatic: true });
}

export function createKeplerEmbed(tone: KeplerTone = 'primary'): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(KEPLER_COLORS[tone])
        .setAuthor({
            name: KEPLER_AUTHOR_NAME,
            ...(keplerAuthorIconURL ? { iconURL: keplerAuthorIconURL } : {})
        })
        .setTimestamp();
}

export function setRequesterFooter(embed: EmbedBuilder, user: User, context?: string): EmbedBuilder {
    return embed.setFooter({
        text: context ? `${context} • Demandé par ${user.username}` : `Demandé par ${user.username}`,
        iconURL: user.displayAvatarURL({ forceStatic: true })
    });
}

export function createStatusEmbed(
    title: string,
    description: string,
    tone: KeplerTone = 'primary'
): EmbedBuilder {
    return createKeplerEmbed(tone)
        .setTitle(title)
        .setDescription(description);
}
