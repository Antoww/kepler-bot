import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure les paramètres du bot')
    .addStringOption(option => option.setName('parametre')
        .setDescription('Le paramètre à configurer')
        .setRequired(true)
        .addChoices(
            { name: 'Préfixe', value: 'prefix' },
            { name: 'Langue', value: 'language' },
            { name: 'Logs', value: 'logs' }
        ))
    .addStringOption(option => option.setName('valeur')
        .setDescription('La nouvelle valeur')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const parameter = interaction.options.getString('parametre')!;
    const value = interaction.options.getString('valeur')!;

    // Ici vous pouvez ajouter la logique pour sauvegarder la configuration
    // dans votre base de données ou fichier de configuration

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#00ff00')
        .setTitle('✅ Configuration mise à jour')
        .setDescription(`Le paramètre **${parameter}** a été défini sur **${value}**`)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 