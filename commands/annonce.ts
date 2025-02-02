import { type CommandInteraction, SlashCommandBuilder , EmbedBuilder, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('annonce')
    .setDescription('Envoie un embed d\'annonce.')

    .addStringOption(option =>
        option.setName('titre')
            .setDescription('Le titre de l\'annonce.')
            .setRequired(true))

    .addStringOption(option =>
        option.setName('description')
            .setDescription('La description de l\'annonce.')
            .setRequired(true))

    .addStringOption(option =>
        option.setName('couleur')
            .setDescription('La couleur de l\'embed (format HEX).')
            .setRequired(true))

    .addStringOption(option =>
        option.setName('image')
            .setDescription('L\'URL de l\'image de l\'embed.')
            .setRequired(false))

    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {

    if (!interaction.guild) {
        interaction.reply('Erreur : Vous devez être sur un serveur Discord')
        return;
    }

    const titre = interaction.options.get('titre')?.value as string;
    const description = interaction.options.get('description')?.value as string;
    const couleur = interaction.options.get('couleur')?.value as string;
    const image = interaction.options.get('image')?.value as string;

    const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.user?.username, iconURL: interaction.user?.displayAvatarURL({ forceStatic: false }) })
        .setColor(couleur as `#${string}`)
        .setTitle(titre)
        .setDescription(description)
        .setImage(image)
        .setFooter({
            text: 'Annonce par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();
    
    try {
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'annonce :', error);
        interaction.reply('Erreur lors de l\'envoi de l\'annonce.');
    }
}