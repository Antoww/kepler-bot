import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('logconfig')
    .setDescription('Configure les logs du serveur')
    .addChannelOption(option => option.setName('canal')
        .setDescription('Le canal où envoyer les logs')
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

    // Ici vous pouvez ajouter la logique pour sauvegarder la configuration
    // dans votre base de données ou fichier de configuration

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#00ff00')
        .setTitle('✅ Configuration des logs mise à jour')
        .setDescription(`Les logs seront maintenant envoyés dans ${channel}`)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 