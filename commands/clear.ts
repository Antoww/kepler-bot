import { type CommandInteraction, SlashCommandBuilder, ChannelType, TextChannel, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages')
    .addIntegerOption(option => option.setName('nombre')
        .setDescription('Nombre de messages à supprimer')
    .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: CommandInteraction) {

    if (!interaction.guild) {
        interaction.reply('Erreur : Vous devez être sur un serveur Discord.')
        return;
    }

    const amount = interaction.options.get('nombre')?.value as number;
    if (amount < 1 || amount > 100) {
        interaction.reply('Erreur : Vous devez entrer un nombre entre 1 et 100.');
        return;
    }

    if (interaction.channel?.isTextBased() && interaction.channel.type === ChannelType.GuildText) {
        const textChannel = interaction.channel as TextChannel;
        await textChannel.bulkDelete(amount, true)
            .then(messages => {
                const messageCount = messages.size;
                const messageText = messageCount === 1 ? 'message' : 'messages';
                interaction.reply(`Suppression de ${messageCount} ${messageText}.`);
            })
            .catch(error => {
                console.error('Erreur lors de la suppression des messages :', error);
                interaction.reply('Erreur lors de la suppression des messages.');
            });
    } else {
        interaction.reply('Erreur : Impossible de trouver le canal ou le canal n\'est pas un canal de texte.');
    }

}