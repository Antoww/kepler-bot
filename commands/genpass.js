import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';


export const data = new SlashCommandBuilder()
    .setName('genpass')
    .setDescription('Génère un mot de passe aléatoire.');
export async function execute(interaction) {
    const generatePassword = (length, charset) => {
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        return password;
    };

    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    const length = 12; // Default length

    const password = generatePassword(length, charset);

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Mot de passe généré')
        .setDescription(`Voici votre mot de passe : \`${password}\``)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    try {
        await interaction.user.send({ embeds: [embed] });
        await interaction.reply({ content: 'Le mot de passe a été envoyé en message privé.', ephemeral: true });
    // deno-lint-ignore no-unused-vars
    } catch (error) {
        await interaction.reply({ content: 'Impossible d\'envoyer un message privé. Veuillez vérifier vos paramètres de confidentialité.', ephemeral: true });
    }
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${file} executée par ${interaction.user.tag} (${interaction.user.id})`);
}