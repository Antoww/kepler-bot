import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';


export const data = new SlashCommandBuilder()
    .setName('genpass')
    .setDescription('Génère un mot de passe aléatoire.')
    .addStringOption(option => option.setName('longueur')
        .setDescription('Longueur du mot de passe')
        .setRequired(false));

export async function execute(interaction: CommandInteraction) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    const length = interaction.options.get("longueur")?.value as number || 12; // Default length

    if (length > 100) {
        await interaction.reply({ content: 'La longueur du mot de passe ne peut pas dépasser 100 caractères.', ephemeral: true});
        return;

    }

    const generatePassword = (length: number, charset: string | any[]) => {
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        return password;
    };

    const password = generatePassword(length, charset);

    const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.client.user?.username, iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) })
        .setColor('#0099ff')
        .setTitle('Mot de passe généré')
        .setDescription(`Voici votre mot de passe : \`${password}\``)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    try {
        await interaction.user.send({ embeds: [embed] });
        await interaction.reply({ content: 'Le mot de passe a été envoyé en message privé.', ephemeral: true });
    // deno-lint-ignore no-unused-vars
    } catch (error) {
        await interaction.reply({ content: 'Impossible d\'envoyer un message privé. Veuillez vérifier vos paramètres de confidentialité.', ephemeral: true });
    }
}