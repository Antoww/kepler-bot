import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { createKeplerEmbed, KEPLER_MESSAGES } from '../../utils/theme.ts';

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

export const data = new SlashCommandBuilder().setName('quiz').setDescription('Lance une session de quiz interactif');

export async function execute(interaction: ChatInputCommandInteraction) {
    let score = 0;
    let played = 0;
    let current = pickQuestion();
    const response = await interaction.reply({ ...questionPayload(current, score, played), fetchReply: true });
    const collector = response.createMessageComponentCollector({ time: 2 * 60 * 1000 });

    collector.on('collect', async component => {
        if (component.user.id !== interaction.user.id) {
            await component.reply({ content: KEPLER_MESSAGES.unauthorizedComponent, ephemeral: true });
            return;
        }
        if (component.customId === 'quiz:next') {
            current = pickQuestion(current.question);
            await component.update(questionPayload(current, score, played));
            return;
        }
        const selected = Number(component.customId.split(':')[2]);
        const chosen = current.answers[selected];
        const correct = chosen === current.correct;
        played++;
        if (correct) score++;
        await component.update(answerPayload(current, selected, correct, score, played));
    });

    collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => null);
    });
}

function questionPayload(question: Question, score: number, played: number) {
    const embed = createKeplerEmbed('accent').setTitle('🧠 Quiz Kepler').setDescription(`**${question.question}**`)
        .setFooter({ text: `Score : ${score}/${played} • 30 secondes conseillées par question` });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        question.answers.map((answer, index) => new ButtonBuilder().setCustomId(`quiz:answer:${index}`).setLabel(`${String.fromCharCode(65 + index)}. ${answer}`).setStyle(ButtonStyle.Secondary))
    );
    return { content: '', embeds: [embed], components: [row] };
}

function answerPayload(question: Question, selected: number, correct: boolean, score: number, played: number) {
    const answers = question.answers.map((answer, index) => new ButtonBuilder()
        .setCustomId(`quiz:answer:${index}`).setLabel(`${String.fromCharCode(65 + index)}. ${answer}`)
        .setStyle(answer === question.correct ? ButtonStyle.Success : index === selected ? ButtonStyle.Danger : ButtonStyle.Secondary)
        .setDisabled(true));
    const embed = createKeplerEmbed(correct ? 'success' : 'danger').setTitle(correct ? '✅ Bonne réponse' : '❌ Mauvaise réponse')
        .setDescription(`La réponse était **${question.correct}**.\n\n${question.explanation}`)
        .setFooter({ text: `Score : ${score}/${played}` });
    return { content: '', embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(answers), new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('quiz:next').setLabel('Question suivante').setEmoji('➡️').setStyle(ButtonStyle.Primary))] };
}

function pickQuestion(previous?: string): Question {
    const available = previous ? QUESTIONS.filter(question => question.question !== previous) : QUESTIONS;
    const question = available[Math.floor(Math.random() * available.length)];
    const answers = [...question.answers].sort(() => Math.random() - 0.5);
    return { ...question, answers };
}
