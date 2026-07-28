import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';

const categories = [
    { name: 'Global', value: 'global', description: 'Blagues de tout type' },
    { name: 'Dev', value: 'dev', description: 'Blagues de développeurs' },
    { name: 'Dark', value: 'dark', description: 'Blagues dark' },
    { name: 'Limit', value: 'limit', description: 'Blagues limites' },
    { name: 'Beauf', value: 'beauf', description: 'Blagues beauf' },
    { name: 'Blondes', value: 'blondes', description: 'Blagues de blondes' }
];

async function fetchJoke(type: string): Promise<{ joke: string; answer: string }> {
    // @ts-ignore - Deno global in Deno runtime
    const token = globalThis.Deno?.env?.get('BLAGUES_API_TOKEN');

    if (!token) {
        console.error('BLAGUES_API_TOKEN environment variable is not set');
        throw new Error('BLAGUES_API_TOKEN environment variable is not set');
    }

    console.log(`Fetching joke from category: ${type}`);

    try {
        const response = await fetch(`https://www.blagues-api.fr/api/type/${type}/random`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Response status: ${response.status}`);

        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = 'Unable to read error response';
            }
            console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`Failed to fetch joke: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Successfully fetched joke data');
        return data;
    } catch (error) {
        console.error('Error in fetchJoke:', error);
        throw error;
    }
}

export const data = new SlashCommandBuilder()
    .setName("blague")
    .setDescription("Raconte une blague aléatoire")
    .addStringOption(option =>
        option.setName("categorie")
            .setDescription("Choisir une catégorie de blague")
            .setRequired(false)
            .addChoices(...categories.map(cat => ({ name: cat.name, value: cat.value })))
    );

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    try {
        const category = interaction.options.getString("categorie") || "global";
        const joke = await fetchJoke(category);

        const embed = createKeplerEmbed()
            .setColor(KEPLER_COLORS.warning)
            .setTitle("😄 Blague du jour")
            .addFields(
                { name: "Question", value: joke.joke },
                { name: "Réponse", value: joke.answer }
            )
            .setFooter({
                text: `Catégorie: ${categories.find(cat => cat.value === category)?.name} • Demandé par ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId("another_joke")
            .setLabel("Une autre !")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎲");

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(button);

        const response = await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: KEPLER_MESSAGES.unauthorizedComponent, ephemeral: true });
                return;
            }

            await i.deferUpdate();
            try {
                const newJoke = await fetchJoke(category);

                const newEmbed = createKeplerEmbed()
                    .setColor(KEPLER_COLORS.warning)
                    .setTitle("😄 Blague du jour")
                    .addFields(
                        { name: "Question", value: newJoke.joke },
                        { name: "Réponse", value: newJoke.answer }
                    )
                    .setFooter({
                        text: `Catégorie: ${categories.find(cat => cat.value === category)?.name} • Demandé par ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                    })
                    .setTimestamp();

                await i.editReply({
                    embeds: [newEmbed],
                    components: [row]
                });
            } catch (error) {
                console.error('Error fetching new joke:', error);
                await i.editReply({
                    content: "Erreur lors de la récupération d'une nouvelle blague.",
                    embeds: [],
                    components: [row]
                });
            }
        });

        collector.on("end", () => {
            row.components[0].setDisabled(true);
            interaction.editReply({
                components: [row]
            }).catch(console.error);
        });

    } catch (error) {
        console.error('Error in execute function:', error);

        let errorMessage = "Désolé, je n'ai pas pu récupérer de blague pour le moment.";

        if (error instanceof Error) {
            if (error.message.includes('BLAGUES_API_TOKEN')) {
                errorMessage = "Configuration manquante : Le token de l'API blagues n'est pas configuré.";
            } else if (error.message.includes('401')) {
                errorMessage = "Erreur d'authentification : Le token de l'API blagues est invalide.";
            } else if (error.message.includes('429')) {
                errorMessage = "Trop de requêtes : Veuillez réessayer dans quelques minutes.";
            } else if (error.message.includes('Failed to fetch joke:')) {
                errorMessage = `Erreur API : ${error.message}`;
            }
        }

        await interaction.editReply(errorMessage);
    }
}