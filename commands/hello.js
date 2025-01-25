const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Dit bonjour au bot.'),
    async execute(interaction) {
        // Envoie une réponse à l'interaction
        const reply = await interaction.reply({ content: 'Bonjour ! 👋', fetchReply: true });

        // Ajoute une réaction au message envoyé
        try {
            const emoji = '<a:valid:638509756188983296>'; // Emoji personnalisé
            await reply.react(emoji);
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la réaction :', error);
        }
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${file} executée par ${interaction.user.tag} (${interaction.user.id})`);
    },
};
