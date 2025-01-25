const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Donne des informations sur un utilisateur.')
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription('Mentionne un utilisateur ou entre une ID utilisateur')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('utilisateur') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('User Info')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Nom d\'utilisateur :', value: `${user.username}#${user.discriminator}`, inline: true },
                { name: 'ID :', value: `${user.id}`, inline: true },
                { name: 'Bot :', value: `${user.bot ? 'Oui' : 'Non'}`, inline: true },
                { name: 'Créé le :', value: `${user.createdAt}`, inline: true },
                { name: 'Rejoint le :', value: `${member.joinedAt}`, inline: true },
                { name: 'Rôles :', value: `${member.roles.cache.map(role => role.name).join(', ')}`, inline: true }
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${file} executée par ${interaction.user.tag} (${interaction.user.id})`);
    },
};