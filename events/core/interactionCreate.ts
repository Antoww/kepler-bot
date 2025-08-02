import { type CommandInteraction } from "discord.js";
export const name = 'interactionCreate';
export async function execute(interaction: CommandInteraction) {
    if (!interaction.isCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
        console.log(`Commande ${interaction.commandName} exécutée avec succès.`);
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${interaction.commandName} executée par ${interaction.user.tag} (${interaction.user.id})`);
    } catch (error) {
        console.error(`Erreur dans la commande ${interaction.commandName}:`, error);
        
        // Vérifier si l'interaction a déjà été gérée
        if (!interaction.deferred && !interaction.replied) {
            try {
                await interaction.reply({ 
                    content: 'Il y a eu une erreur en exécutant cette commande.', 
                    ephemeral: true 
                });
            } catch (replyError) {
                console.error("Erreur lors de la réponse d'erreur:", replyError);
            }
        } else {
            try {
                await interaction.editReply({ 
                    content: 'Il y a eu une erreur en exécutant cette commande.' 
                });
            } catch (editError) {
                console.error("Erreur lors de l'édition de la réponse d'erreur:", editError);
            }
        }
    }
}
