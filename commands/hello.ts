import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Le bot dit "Bonjour !" car il est super sympa.');
export async function execute(interaction: CommandInteraction) {
    // Envoie une réponse à l'interaction
    const reply = await interaction.reply({ content: 'Bonjour ! 👋', withResponse: true });

    // Ajoute une réaction au message envoyé
    try {
        const emoji = '<a:valid:638509756188983296>'; // Emoji personnalisé
        await reply.resource?.message?.react(emoji);
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la réaction :', error);
    }
}
