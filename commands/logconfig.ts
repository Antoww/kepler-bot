import { type CommandInteraction, SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { updateLogChannel, getLogChannel } from '../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('logconfig')
    .setDescription('Configure le canal de logs du serveur')
    .addChannelOption(option => option.setName('canal')
        .setDescription('Le canal où envoyer les logs')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        return interaction.reply({ content: 'Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('canal');
    if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.reply({ content: 'Veuillez sélectionner un canal de texte valide.', ephemeral: true });
    }

    try {
        const guildId = interaction.guild.id;
        const channelId = channel.id;
        
        await updateLogChannel(guildId, channelId);
        
        console.log(`📝 [LOG CONFIG] Serveur: ${interaction.guild.name} (${guildId}) | Canal de logs configuré: ${channel.name} (${channelId})`);
        
        await interaction.reply({ 
            content: `✅ Le canal de logs a été configuré avec succès !\n📋 Canal: ${channel}\n🔔 Tous les événements du serveur seront maintenant loggés ici.`, 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Erreur lors de la configuration du canal de logs:', error);
        await interaction.reply({ 
            content: '❌ Erreur lors de la configuration du canal de logs. Veuillez réessayer.', 
            ephemeral: true 
        });
    }
} 