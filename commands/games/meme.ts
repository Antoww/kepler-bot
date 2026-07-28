import { createKeplerEmbed, KEPLER_COLORS } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../utils/logger.ts';

interface MemeResponse {
    title: string;
    url: string;
    postLink: string;
    subreddit: string;
    nsfw?: boolean;
}

const SUBREDDITS = [
    'rance',
    'moi_dlvv',
    'MemeFrancais',
    'memes',
    'wholesomememes',
    'AdviceAnimals',
    'ProgrammerHumor',
    'HistoryMemes'
] as const;
const MAX_RECENT_MEMES = 100;
const recentMemeIds = new Set<string>();
const recentMemeQueue: string[] = [];
const lastSubredditByScope = new Map<string, string>();

export const data = new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Affiche un meme aléatoire');

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    try {
        const scopeId = interaction.guildId ?? interaction.user.id;
        const meme = await fetchUniqueMeme(lastSubredditByScope.get(scopeId));
        rememberMeme(meme);
        lastSubredditByScope.set(scopeId, meme.subreddit.toLowerCase());

        const embed = createKeplerEmbed()
            .setAuthor({
                name: interaction.client.user?.username,
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
            })
            .setColor(KEPLER_COLORS.danger)
            .setTitle(`😂 ${meme.title}`)
            .setURL(meme.postLink)
            .setImage(meme.url)
            .setFooter({
                text: `Demandé par ${interaction.user.username} • Depuis r/${meme.subreddit}`,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        logger.error('Erreur lors de la récupération du meme', error, 'Meme');
        await interaction.editReply("Une erreur s'est produite lors de la récupération du meme. Réessayez plus tard !");
    }
}

async function fetchUniqueMeme(previousSubreddit?: string): Promise<MemeResponse> {
    const candidates = shuffle(SUBREDDITS.filter(
        subreddit => subreddit.toLowerCase() !== previousSubreddit
    ));

    for (const subreddit of candidates) {
        try {
            const response = await fetch(`https://meme-api.com/gimme/${encodeURIComponent(subreddit)}`, {
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) continue;

            const meme = await response.json() as MemeResponse;
            const memeId = getMemeId(meme);
            if (!meme.title || !meme.url || !meme.postLink || !meme.subreddit || meme.nsfw !== false || recentMemeIds.has(memeId)) {
                continue;
            }
            return meme;
        } catch (error) {
            logger.warn(`Source r/${subreddit} indisponible`, error, 'Meme');
        }
    }

    throw new Error('Aucun meme SFW inédit disponible dans les sources configurées');
}

function rememberMeme(meme: MemeResponse): void {
    const memeId = getMemeId(meme);
    recentMemeIds.add(memeId);
    recentMemeQueue.push(memeId);

    while (recentMemeQueue.length > MAX_RECENT_MEMES) {
        const oldest = recentMemeQueue.shift();
        if (oldest) recentMemeIds.delete(oldest);
    }
}

function getMemeId(meme: MemeResponse): string {
    return meme.postLink || meme.url;
}

function shuffle<T>(values: readonly T[]): T[] {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index--) {
        const target = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
}
