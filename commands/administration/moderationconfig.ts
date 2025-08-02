import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { updateModerationChannel } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('moderationconfig')
    .setDescription('Configure le canal de modération du serveur')
    .addChannelOption(option => option.setName('canal')
        .setDescription('Le canal où envoyer les logs de modération')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const channel = interaction.options.getChannel('canal');
    
    if (!channel) {
        await interaction.reply('Canal invalide.');
        return;
    }

    try {
        // Sauvegarder la configuration dans la base de données
        await updateModerationChannel(interaction.guild.id, channel.id);

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#ff9900')
            .setTitle('⚖️ Configuration de modération mise à jour')
            .setDescription(`Les logs de modération seront maintenant envoyés dans ${channel}`)
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la configuration du canal de modération:', error);
        await interaction.reply('❌ Une erreur est survenue lors de la configuration du canal de modération.');
    }
}
