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
    { question: 'Quelle unité mesure une fréquence ?', answers: ['Hertz', 'Watt', 'Volt', 'Pascal'], correct: 'Hertz', explanation: 'Un hertz correspond à un événement par seconde.' },
    { question: 'Quelle est la plus grande planète du Système solaire ?', answers: ['Jupiter', 'Saturne', 'Neptune', 'Uranus'], correct: 'Jupiter', explanation: 'Jupiter possède un diamètre environ onze fois supérieur à celui de la Terre.' },
    { question: 'Quel gaz les plantes absorbent-elles principalement ?', answers: ['Dioxyde de carbone', 'Oxygène', 'Azote', 'Hydrogène'], correct: 'Dioxyde de carbone', explanation: 'Les plantes utilisent le dioxyde de carbone pendant la photosynthèse.' },
    { question: 'Combien d’os compte généralement le corps humain adulte ?', answers: ['206', '186', '226', '246'], correct: '206', explanation: 'Le squelette humain adulte compte généralement 206 os.' },
    { question: 'Quel organe produit l’insuline ?', answers: ['Pancréas', 'Foie', 'Rein', 'Estomac'], correct: 'Pancréas', explanation: 'Les cellules bêta du pancréas produisent l’insuline.' },
    { question: 'Quelle particule possède une charge électrique négative ?', answers: ['Électron', 'Proton', 'Neutron', 'Photon'], correct: 'Électron', explanation: 'L’électron porte une charge élémentaire négative.' },
    { question: 'À quelle température l’eau pure gèle-t-elle à pression normale ?', answers: ['0 °C', '-10 °C', '10 °C', '32 °C'], correct: '0 °C', explanation: 'À pression atmosphérique normale, l’eau pure gèle à 0 °C.' },
    { question: 'Quelle planète est célèbre pour ses anneaux visibles ?', answers: ['Saturne', 'Mars', 'Vénus', 'Mercure'], correct: 'Saturne', explanation: 'Les anneaux de Saturne sont principalement constitués de glace et de roche.' },
    { question: 'Quel est le symbole chimique de l’oxygène ?', answers: ['O', 'Ox', 'Og', 'Os'], correct: 'O', explanation: 'Le symbole chimique de l’oxygène est O.' },
    { question: 'Quel est le plus vaste océan du monde ?', answers: ['Pacifique', 'Atlantique', 'Indien', 'Austral'], correct: 'Pacifique', explanation: 'L’océan Pacifique couvre environ un tiers de la surface terrestre.' },
    { question: 'Quel fleuve traverse Paris ?', answers: ['Seine', 'Loire', 'Rhône', 'Garonne'], correct: 'Seine', explanation: 'La Seine traverse Paris avant de rejoindre la Manche.' },
    { question: 'Dans quel pays se trouve la ville de Kyoto ?', answers: ['Japon', 'Chine', 'Corée du Sud', 'Thaïlande'], correct: 'Japon', explanation: 'Kyoto fut la capitale impériale du Japon pendant plus de mille ans.' },
    { question: 'Quelle est la capitale de l’Australie ?', answers: ['Canberra', 'Sydney', 'Melbourne', 'Perth'], correct: 'Canberra', explanation: 'Canberra est la capitale fédérale australienne depuis 1913.' },
    { question: 'Quel continent compte le plus de pays ?', answers: ['Afrique', 'Europe', 'Asie', 'Amérique du Sud'], correct: 'Afrique', explanation: 'L’Afrique compte 54 États membres reconnus par les Nations unies.' },
    { question: 'Dans quelle chaîne de montagnes se trouve l’Everest ?', answers: ['Himalaya', 'Alpes', 'Andes', 'Rocheuses'], correct: 'Himalaya', explanation: 'L’Everest se situe dans l’Himalaya, à la frontière du Népal et de la Chine.' },
    { question: 'Quelle mer sépare principalement l’Europe de l’Afrique ?', answers: ['Méditerranée', 'Mer Noire', 'Mer Rouge', 'Mer Baltique'], correct: 'Méditerranée', explanation: 'La mer Méditerranée s’étend entre l’Europe, l’Afrique et l’Asie.' },
    { question: 'Quelle est la capitale du Brésil ?', answers: ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'], correct: 'Brasília', explanation: 'Brasília a remplacé Rio de Janeiro comme capitale en 1960.' },
    { question: 'En quelle année débute la Révolution française ?', answers: ['1789', '1776', '1815', '1848'], correct: '1789', explanation: 'La prise de la Bastille, le 14 juillet 1789, en est un événement emblématique.' },
    { question: 'Qui fut le premier humain à marcher sur la Lune ?', answers: ['Neil Armstrong', 'Buzz Aldrin', 'Youri Gagarine', 'John Glenn'], correct: 'Neil Armstrong', explanation: 'Neil Armstrong a posé le pied sur la Lune le 21 juillet 1969 en temps universel.' },
    { question: 'Quelle civilisation a construit le Machu Picchu ?', answers: ['Incas', 'Mayas', 'Aztèques', 'Romains'], correct: 'Incas', explanation: 'Le Machu Picchu est une cité inca édifiée au XVe siècle.' },
    { question: 'Quel mur est tombé en novembre 1989 ?', answers: ['Mur de Berlin', 'Mur d’Hadrien', 'Grande Muraille', 'Mur des Lamentations'], correct: 'Mur de Berlin', explanation: 'L’ouverture du mur de Berlin a eu lieu le 9 novembre 1989.' },
    { question: 'Quel roi français était surnommé le Roi-Soleil ?', answers: ['Louis XIV', 'Louis XVI', 'Henri IV', 'François Ier'], correct: 'Louis XIV', explanation: 'Louis XIV utilisa le Soleil comme symbole de son pouvoir royal.' },
    { question: 'L’écriture cunéiforme est née dans quelle région antique ?', answers: ['Mésopotamie', 'Gaule', 'Scandinavie', 'Ibérie'], correct: 'Mésopotamie', explanation: 'Les premiers textes cunéiformes connus apparaissent en Mésopotamie.' },
    { question: 'Qui a écrit Les Misérables ?', answers: ['Victor Hugo', 'Émile Zola', 'Albert Camus', 'Jules Verne'], correct: 'Victor Hugo', explanation: 'Victor Hugo publie Les Misérables en 1862.' },
    { question: 'Quel compositeur a écrit la Neuvième Symphonie ?', answers: ['Beethoven', 'Mozart', 'Chopin', 'Vivaldi'], correct: 'Beethoven', explanation: 'La Neuvième Symphonie de Beethoven a été créée en 1824.' },
    { question: 'Quel détective habite au 221B Baker Street ?', answers: ['Sherlock Holmes', 'Hercule Poirot', 'Arsène Lupin', 'Jules Maigret'], correct: 'Sherlock Holmes', explanation: 'Sherlock Holmes est le détective créé par Arthur Conan Doyle.' },
    { question: 'Dans quelle saga trouve-t-on la Terre du Milieu ?', answers: ['Le Seigneur des anneaux', 'Harry Potter', 'Dune', 'Fondation'], correct: 'Le Seigneur des anneaux', explanation: 'La Terre du Milieu est l’univers principal imaginé par J. R. R. Tolkien.' },
    { question: 'Quel peintre est associé au tableau Guernica ?', answers: ['Pablo Picasso', 'Joan Miró', 'Paul Cézanne', 'Henri Matisse'], correct: 'Pablo Picasso', explanation: 'Picasso a peint Guernica en 1937.' },
    { question: 'Quel studio a créé le film Mon voisin Totoro ?', answers: ['Studio Ghibli', 'Pixar', 'DreamWorks', 'Aardman'], correct: 'Studio Ghibli', explanation: 'Mon voisin Totoro est un film de Hayao Miyazaki produit par le Studio Ghibli.' },
    { question: 'Que signifie HTML ?', answers: ['HyperText Markup Language', 'High Transfer Machine Link', 'Home Tool Markup Language', 'Hyperlink Text Mode List'], correct: 'HyperText Markup Language', explanation: 'HTML est le langage de balisage utilisé pour structurer les pages web.' },
    { question: 'Quel protocole sécurisé est utilisé pour naviguer sur le Web ?', answers: ['HTTPS', 'FTP', 'SMTP', 'SSH'], correct: 'HTTPS', explanation: 'HTTPS protège les échanges HTTP grâce au chiffrement TLS.' },
    { question: 'Qui est à l’origine du World Wide Web ?', answers: ['Tim Berners-Lee', 'Alan Turing', 'Linus Torvalds', 'Bill Gates'], correct: 'Tim Berners-Lee', explanation: 'Tim Berners-Lee a proposé le World Wide Web au CERN en 1989.' },
    { question: 'Quel système de gestion de versions utilise la commande commit ?', answers: ['Git', 'Docker', 'Nginx', 'Redis'], correct: 'Git', explanation: 'Dans Git, un commit enregistre un instantané des changements suivis.' },
    { question: 'Quel langage s’exécute nativement dans les navigateurs web ?', answers: ['JavaScript', 'Java', 'C#', 'Go'], correct: 'JavaScript', explanation: 'JavaScript est pris en charge nativement par les principaux navigateurs.' },
    { question: 'Que signifie CPU en informatique ?', answers: ['Central Processing Unit', 'Computer Personal Utility', 'Core Program Usage', 'Central Power User'], correct: 'Central Processing Unit', explanation: 'Le CPU est l’unité centrale de traitement d’un ordinateur.' },
    { question: 'Quelle structure fonctionne selon le principe dernier entré, premier sorti ?', answers: ['Pile', 'File', 'Arbre', 'Graphe'], correct: 'Pile', explanation: 'Une pile suit le principe LIFO : Last In, First Out.' },
    { question: 'Quel nombre vient ensuite : 2, 4, 8, 16 ?', answers: ['32', '24', '30', '34'], correct: '32', explanation: 'Chaque nombre de la suite est le double du précédent.' },
    { question: 'Quelle est la racine carrée de 144 ?', answers: ['12', '14', '10', '16'], correct: '12', explanation: '12 multiplié par 12 est égal à 144.' },
    { question: 'Combien vaut 15 % de 200 ?', answers: ['30', '20', '25', '35'], correct: '30', explanation: '10 % de 200 vaut 20 et 5 % vaut 10, soit 30 au total.' },
    { question: 'Quel nombre est premier ?', answers: ['29', '21', '27', '33'], correct: '29', explanation: '29 n’est divisible que par 1 et par lui-même.' },
    { question: 'Combien de degrés mesure un angle droit ?', answers: ['90', '45', '120', '180'], correct: '90', explanation: 'Par définition, un angle droit mesure 90 degrés.' },
    { question: 'Combien de minutes y a-t-il dans deux heures et demie ?', answers: ['150', '120', '135', '180'], correct: '150', explanation: 'Deux heures valent 120 minutes, auxquelles s’ajoutent 30 minutes.' },
    { question: 'Dans quel sport marque-t-on un essai ?', answers: ['Rugby', 'Basket-ball', 'Tennis', 'Handball'], correct: 'Rugby', explanation: 'Au rugby, aplatir le ballon dans l’en-but adverse marque un essai.' },
    { question: 'Combien de joueurs composent une équipe de basket sur le terrain ?', answers: ['5', '6', '7', '8'], correct: '5', explanation: 'Chaque équipe de basket-ball aligne cinq joueurs sur le terrain.' },
    { question: 'Sur quelle surface joue-t-on traditionnellement Roland-Garros ?', answers: ['Terre battue', 'Gazon', 'Béton', 'Moquette'], correct: 'Terre battue', explanation: 'Le tournoi de Roland-Garros se dispute sur terre battue.' },
    { question: 'Dans quel sport utilise-t-on un volant ?', answers: ['Badminton', 'Squash', 'Padel', 'Tennis de table'], correct: 'Badminton', explanation: 'Le badminton se joue avec une raquette et un volant.' },
    { question: 'Quelle pièce des échecs se déplace en forme de L ?', answers: ['Cavalier', 'Fou', 'Tour', 'Dame'], correct: 'Cavalier', explanation: 'Le cavalier se déplace de deux cases dans une direction puis d’une case perpendiculairement.' },
    { question: 'Combien de cases possède un échiquier ?', answers: ['64', '56', '72', '81'], correct: '64', explanation: 'Un échiquier comporte huit rangées et huit colonnes, soit 64 cases.' },
    { question: 'Quel instrument possède généralement 88 touches ?', answers: ['Piano', 'Violon', 'Trompette', 'Harpe'], correct: 'Piano', explanation: 'Un piano moderne standard possède généralement 88 touches.' }
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
