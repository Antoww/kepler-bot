import { EmbedBuilder, type User } from 'discord.js';

export const KEPLER_COLORS = {
    primary: 0x45d7ff,
    secondary: 0xff6b6b,
    success: 0x57d69b,
    warning: 0xf8c15c,
    danger: 0xff5f6d,
    accent: 0x9d8cff,
    highlight: 0xff8fbd,
    neutral: 0x91a0b8
} as const;

export type KeplerTone = keyof typeof KEPLER_COLORS;

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

export function createKeplerEmbed(tone: KeplerTone = 'primary'): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(KEPLER_COLORS[tone])
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
