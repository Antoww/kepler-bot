import { type CommandInteraction, SlashCommandBuilder, ChannelType, TextChannel, PermissionFlagsBits, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages')
    .addIntegerOption(option => option.setName('nombre')
        .setDescription('Nombre de messages à supprimer')
    .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Cette commande ne peut être utilisée que sur un serveur.',
            ephemeral: true
        });
        return;
    }

    const amount = interaction.options.get('nombre')?.value as number;
    if (amount < 1 || amount > 100) {
        await interaction.reply({
            content: '❌ Vous devez entrer un nombre entre **1** et **100**.',
            ephemeral: true
        });
        return;
    }

    if (interaction.channel?.isTextBased() && interaction.channel.type === ChannelType.GuildText) {
        const textChannel = interaction.channel as TextChannel;
        
        try {
            const messages = await textChannel.bulkDelete(amount, true);
            const messageCount = messages.size;
            const messageText = messageCount === 1 ? 'message' : 'messages';
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🗑️ Messages supprimés')
                .setDescription(`**${messageCount} ${messageText}** supprimé${messageCount > 1 ? 's' : ''} avec succès`)
                .addFields(
                    { name: '📊 Demandé', value: amount.toString(), inline: true },
                    { name: '✅ Supprimé', value: messageCount.toString(), inline: true },
                    { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                    { name: '📍 Canal', value: `<#${textChannel.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Erreur lors de la suppression des messages :', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur de suppression')
                .setDescription('Une erreur est survenue lors de la suppression des messages.')
                .addFields({
                    name: '💡 Causes possibles',
                    value: '• Messages trop anciens (+ de 14 jours)\n• Permissions insuffisantes\n• Messages déjà supprimés'
                })
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed] });
        }
    } else {
        await interaction.reply({
            content: '❌ Cette commande ne peut être utilisée que dans un canal textuel.',
            ephemeral: true
        });
    }
} 