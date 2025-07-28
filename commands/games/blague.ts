import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';

const categories = [
    { name: 'Global', value: 'global', description: 'Blagues de tout type' },
    { name: 'Dev', value: 'dev', description: 'Blagues de développeurs' },
    { name: 'Dark', value: 'dark', description: 'Blagues dark' },
    { name: 'Limit', value: 'limit', description: 'Blagues limites' },
    { name: 'Beauf', value: 'beauf', description: 'Blagues beauf' },
    { name: 'Blondes', value: 'blondes', description: 'Blagues de blondes' }
];

async function fetchJoke(type: string): Promise<{ joke: string; answer: string }> {
    const response = await fetch(`https://www.blagues-api.fr/api/type/${type}/random`, {
        headers: {
            'Authorization': `Bearer ${Deno.env.get('BLAGUES_API_TOKEN')}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch joke');
    }

    return response.json();
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

        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle("😄 Blague du jour")
            .addFields(
                { name: "Question", value: joke.joke },
                { name: "Réponse", value: joke.answer }
            )
            .setFooter({ text: `Catégorie: ${categories.find(cat => cat.value === category)?.name}` })
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
                await i.reply({ content: "Vous ne pouvez pas utiliser ce bouton !", ephemeral: true });
                return;
            }

            await i.deferUpdate();
            const newJoke = await fetchJoke(category);
            
            const newEmbed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("😄 Blague du jour")
                .addFields(
                    { name: "Question", value: newJoke.joke },
                    { name: "Réponse", value: newJoke.answer }
                )
                .setFooter({ text: `Catégorie: ${categories.find(cat => cat.value === category)?.name}` })
                .setTimestamp();

            await i.editReply({
                embeds: [newEmbed],
                components: [row]
            });
        });

        collector.on("end", () => {
            row.components[0].setDisabled(true);
            interaction.editReply({
                components: [row]
            }).catch(console.error);
        });

    } catch (error) {
        console.error(error);
        await interaction.editReply("Désolé, je n'ai pas pu récupérer de blague pour le moment. Réessayez plus tard !");
    }
}