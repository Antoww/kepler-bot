import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getQuizLeaderboard, getQuizScore, recordQuizAnswer, type QuizScore } from '../../database/db.ts';
import { createKeplerEmbed, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { logger } from '../../utils/logger.ts';

interface Question { question: string; answers: string[]; correct: string; explanation: string; }

const QUESTIONS: Question[] = [
    { question: 'Quelle planète est la plus proche du Soleil ?', answers: ['Mercure', 'Vénus', 'Mars', 'Terre'], correct: 'Mercure', explanation: 'Mercure boucle une orbite autour du Soleil en environ 88 jours.' },
    { question: 'Quel langage a été créé par Guido van Rossum ?', answers: ['Python', 'Rust', 'Java', 'Go'], correct: 'Python', explanation: 'Guido van Rossum a commencé le développement de Python à la fin des années 1980.' },
    { question: 'Combien de côtés possède un dodécagone ?', answers: ['10', '12', '14', '20'], correct: '12', explanation: 'Le préfixe dodéca signifie douze.' },
    { question: 'Quelle ville est la capitale du Canada ?', answers: ['Ottawa', 'Toronto', 'Montréal', 'Vancouver'], correct: 'Ottawa', explanation: 'Ottawa est la capitale fédérale du Canada.' },
    { question: 'Dans quel océan se trouve l’archipel d’Hawaï ?', answers: ['Pacifique', 'Atlantique', 'Indien', 'Arctique'], correct: 'Pacifique', explanation: 'Hawaï se situe dans le Pacifique central.' },
    { question: 'Quel élément chimique porte le symbole Au ?', answers: ['Or', 'Argent', 'Cuivre', 'Aluminium'], correct: 'Or', explanation: 'Au vient du latin aurum.' },
    { question: 'Qui a peint La Nuit étoilée ?', answers: ['Vincent van Gogh', 'Claude Monet', 'Pablo Picasso', 'Salvador Dalí'], correct: 'Vincent van Gogh', explanation: 'Van Gogh a peint cette œuvre en 1889.' },
    { question: 'Quelle est la valeur binaire du nombre décimal 10 ?', answers: ['1010', '1001', '1100', '1110'], correct: '1010', explanation: '10 se décompose en 8 + 2, soit 1010 en base 2.' },
    { question: 'Quel animal figure sur le logo de Firefox ?', answers: ['Un renard', 'Un panda roux', 'Un loup', 'Un écureuil'], correct: 'Un renard', explanation: 'Le logo représente un renard stylisé entourant un globe.' },
    { question: 'Combien de joueurs une équipe de football aligne-t-elle sur le terrain ?', answers: ['11', '9', '10', '12'], correct: '11', explanation: 'Une équipe aligne onze joueurs, gardien compris.' },
    { question: 'Quel est le plus grand désert chaud du monde ?', answers: ['Sahara', 'Gobi', 'Kalahari', 'Atacama'], correct: 'Sahara', explanation: 'Le Sahara couvre une grande partie de l’Afrique du Nord.' },
    { question: 'Quelle unité mesure une fréquence ?', answers: ['Hertz', 'Watt', 'Volt', 'Pascal'], correct: 'Hertz', explanation: 'Un hertz correspond à un événement par seconde.' }
];

const PANEL_TIMEOUT = 5 * 60 * 1000;

export const data = new SlashCommandBuilder().setName('quiz').setDescription('Ouvre le quiz et ses classements');

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }

    let current: Question | null = null;
    await interaction.deferReply();
    const response = await interaction.editReply(await homePayload(interaction));
    const collector = response.createMessageComponentCollector({ time: PANEL_TIMEOUT });

    collector.on('collect', async component => {
        if (component.user.id !== interaction.user.id) {
            await component.reply({ content: KEPLER_MESSAGES.unauthorizedComponent, ephemeral: true });
            return;
        }
        try {
            if (component.customId === 'quiz:home') {
                current = null;
                await component.deferUpdate();
                await component.editReply(await homePayload(interaction));
                return;
            }
            if (component.customId === 'quiz:play' || component.customId === 'quiz:next') {
                current = pickQuestion(current?.question);
                await component.deferUpdate();
                const score = await getQuizScore(interaction.guildId!, interaction.user.id);
                await component.editReply(questionPayload(current, score));
                return;
            }
            if (component.customId.startsWith('quiz:leaderboard:')) {
                const scope = component.customId.endsWith(':global') ? 'global' : interaction.guildId!;
                await component.deferUpdate();
                await component.editReply(await leaderboardPayload(interaction, scope));
                return;
            }
            if (!current || !component.customId.startsWith('quiz:answer:')) return;

            const selected = Number(component.customId.split(':')[2]);
            const correct = current.answers[selected] === current.correct;
            await component.deferUpdate();
            const scores = await recordQuizAnswer(interaction.guildId!, interaction.user.id, correct);
            await component.editReply(answerPayload(current, selected, correct, scores.server, scores.global));
        } catch (error) {
            logger.error('Erreur dans le quiz', error, 'Quiz');
            const payload = { content: KEPLER_MESSAGES.unexpectedError, embeds: [], components: [] };
            if (component.deferred || component.replied) await component.editReply(payload);
            else await component.reply({ content: payload.content, ephemeral: true });
        }
    });

    collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => null);
    });
}

async function homePayload(interaction: ChatInputCommandInteraction) {
    const [server, global] = await Promise.all([
        getQuizScore(interaction.guildId!, interaction.user.id),
        getQuizScore('global', interaction.user.id)
    ]);
    const embed = createKeplerEmbed('accent')
        .setTitle('🧠 Quiz Kepler')
        .setDescription('Enchaînez les bonnes réponses pour construire votre streak. Une erreur remet le streak courant à zéro.')
        .addFields(
            { name: '🏠 Serveur', value: scoreSummary(server), inline: true },
            { name: '🌍 Global', value: scoreSummary(global), inline: true }
        )
        .setFooter({ text: 'Panneau actif pendant 5 minutes' });
    const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('quiz:play').setLabel('Jouer').setEmoji('▶️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('quiz:leaderboard:server').setLabel('Classement serveur').setEmoji('🏠').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('quiz:leaderboard:global').setLabel('Classement global').setEmoji('🌍').setStyle(ButtonStyle.Secondary)
    );
    return { content: '', embeds: [embed], components: [actions] };
}

function questionPayload(question: Question, score: QuizScore | null) {
    const embed = createKeplerEmbed('accent')
        .setTitle('🧠 Quiz Kepler')
        .setDescription(`**${question.question}**`)
        .setFooter({ text: `Streak actuel : ${score?.current_streak ?? 0} • Record serveur : ${score?.best_streak ?? 0}` });
    return {
        content: '', embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
            question.answers.map((answer, index) => new ButtonBuilder()
                .setCustomId(`quiz:answer:${index}`)
                .setLabel(`${String.fromCharCode(65 + index)}. ${answer}`)
                .setStyle(ButtonStyle.Secondary))
        )]
    };
}

function answerPayload(question: Question, selected: number, correct: boolean, server: QuizScore, global: QuizScore) {
    const answers = question.answers.map((answer, index) => new ButtonBuilder()
        .setCustomId(`quiz:answer:${index}`)
        .setLabel(`${String.fromCharCode(65 + index)}. ${answer}`)
        .setStyle(answer === question.correct ? ButtonStyle.Success : index === selected ? ButtonStyle.Danger : ButtonStyle.Secondary)
        .setDisabled(true));
    const embed = createKeplerEmbed(correct ? 'success' : 'danger')
        .setTitle(correct ? `✅ Bonne réponse · streak ${server.current_streak}` : '❌ Mauvaise réponse · streak réinitialisé')
        .setDescription(`La réponse était **${question.correct}**.\n\n${question.explanation}`)
        .addFields(
            { name: '🏠 Record serveur', value: String(server.best_streak), inline: true },
            { name: '🌍 Record global', value: String(global.best_streak), inline: true }
        );
    return {
        content: '', embeds: [embed],
        components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(answers),
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('quiz:next').setLabel('Question suivante').setEmoji('➡️').setStyle(ButtonStyle.Primary),
                homeButton()
            )
        ]
    };
}

async function leaderboardPayload(interaction: ChatInputCommandInteraction, scopeId: string) {
    const scores = await getQuizLeaderboard(scopeId, 10);
    const users = await Promise.all(scores.map(score => interaction.client.users.fetch(score.user_id).catch(() => null)));
    const lines = scores.map((score, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
        const name = users[index]?.username ?? 'Utilisateur inconnu';
        return `${medal} **${name}** · record **${score.best_streak}** · ${score.total_correct}/${score.total_answers}`;
    });
    const isGlobal = scopeId === 'global';
    const embed = createKeplerEmbed(isGlobal ? 'highlight' : 'primary')
        .setTitle(isGlobal ? '🌍 Classement global du quiz' : `🏠 Classement quiz · ${interaction.guild!.name}`)
        .setDescription(lines.join('\n') || 'Aucun score enregistré pour le moment.')
        .setFooter({ text: 'Classement par meilleur streak, puis bonnes réponses' });
    return { content: '', embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(homeButton())] };
}

function scoreSummary(score: QuizScore | null) {
    return `Streak : **${score?.current_streak ?? 0}**\nRecord : **${score?.best_streak ?? 0}**\nRéponses : **${score?.total_correct ?? 0}/${score?.total_answers ?? 0}**`;
}

function homeButton() {
    return new ButtonBuilder().setCustomId('quiz:home').setLabel('Accueil').setEmoji('↩️').setStyle(ButtonStyle.Secondary);
}

function pickQuestion(previous?: string): Question {
    const available = previous ? QUESTIONS.filter(question => question.question !== previous) : QUESTIONS;
    const question = available[Math.floor(Math.random() * available.length)];
    return { ...question, answers: [...question.answers].sort(() => Math.random() - 0.5) };
}
