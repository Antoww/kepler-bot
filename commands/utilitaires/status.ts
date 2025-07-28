import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, ActivityType } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('status')
    .setDescription('Change le statut du bot')
    .addStringOption(option => option.setName('type')
        .setDescription('Le type de statut')
        .setRequired(true)
        .addChoices(
            { name: 'Joue à', value: 'PLAYING' },
            { name: 'Écoute', value: 'LISTENING' },
            { name: 'Regarde', value: 'WATCHING' },
            { name: 'Compétition', value: 'COMPETING' }
        ))
    .addStringOption(option => option.setName('message')
        .setDescription('Le message du statut')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    // Vérifier les permissions
    if (!interaction.memberPermissions?.has('Administrator')) {
        await interaction.reply({ content: 'Vous devez avoir les permissions d\'administrateur pour utiliser cette commande.', ephemeral: true });
        return;
    }

    const type = interaction.options.getString('type') as keyof typeof ActivityType;
    const message = interaction.options.getString('message')!;

    try {
        await interaction.client.user?.setActivity(message, { type: ActivityType[type] });
        
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#00ff00')
            .setTitle('✅ Statut mis à jour')
            .setDescription(`Le statut a été changé avec succès !`)
            .addFields(
                { name: '📝 Type', value: type, inline: true },
                { name: '💬 Message', value: message, inline: true }
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors du changement de statut:', error);
        await interaction.reply({ content: 'Erreur lors du changement de statut.', ephemeral: true });
    }
} 