import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('annonce')
    .setDescription('Fait une annonce')
    .addStringOption(option => option.setName('message')
        .setDescription('Le message de l\'annonce')
        .setRequired(true))
    .addStringOption(option => option.setName('couleur')
        .setDescription('La couleur de l\'annonce')
        .setRequired(false)
        .addChoices(
            { name: 'Bleu', value: '#0099ff' },
            { name: 'Vert', value: '#00ff00' },
            { name: 'Rouge', value: '#ff0000' },
            { name: 'Orange', value: '#ffa500' },
            { name: 'Violet', value: '#9b59b6' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const message = interaction.options.getString('message')!;
    const color = interaction.options.getString('couleur') || '#0099ff';

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.user.username, 
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor(color as any)
        .setTitle('📢 Annonce')
        .setDescription(message)
        .setFooter({
            text: 'Annonce par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 