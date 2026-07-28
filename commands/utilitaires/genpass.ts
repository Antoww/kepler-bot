import { createKeplerEmbed, KEPLER_COLORS } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('genpass')
    .setDescription('Génère un mot de passe sécurisé')
    .addIntegerOption(option => option.setName('longueur')
        .setDescription('Longueur du mot de passe (8-50)')
        .setRequired(false));

export async function execute(interaction: CommandInteraction) {
    const length = interaction.options.getInteger('longueur') || 12;

    if (length < 8 || length > 50) {
        await interaction.reply('La longueur doit être comprise entre 8 et 50 caractères.');
        return;
    }

    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';

    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username,
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.success)
        .setTitle('🔐 Mot de passe généré')
        .setDescription(`\`\`\`${password}\`\`\``)
        .addFields(
            { name: '📏 Longueur', value: length.toString(), inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}