const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('genpass')
        .setDescription('Génère un mot de passe aléatoire'),
    async execute(interaction) {
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
            .setDescription(`Voici votre mot de passe : \`${password}\``);

        await interaction.reply({ embeds: [embed] });
    },
};