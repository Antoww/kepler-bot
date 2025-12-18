import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getUserWarnings } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Affiche tous les avertissements d\'un utilisateur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur dont afficher les avertissements')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const target = interaction.options.getUser('utilisateur');
    
    if (!target) {
        await interaction.reply('Utilisateur invalide.');
        return;
    }

    try {
        // Récupérer tous les warnings de l'utilisateur
        const warnings = await getUserWarnings(interaction.guild.id, target.id);

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `Avertissements - ${target.tag}`, 
                iconURL: target.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#ffaa00')
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setFooter({
                        text: 'Demandé par ' + interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                    })

        if (warnings.length === 0) {
            embed.setDescription('✅ Cet utilisateur n\'a aucun avertissement.');
        } else {
            embed.setDescription(`⚠️ **${warnings.length}** avertissement(s) trouvé(s)`);

            // Afficher les warnings (maximum 10)
            const warningsToShow = warnings.slice(0, 10);
            
            for (const warning of warningsToShow) {
                const date = new Date(warning.created_at);
                const timestamp = Math.floor(date.getTime() / 1000);
                
                // Récupérer les informations du modérateur
                let moderatorInfo = warning.moderator_id;
                try {
                    const moderator = await interaction.client.users.fetch(warning.moderator_id);
                    moderatorInfo = moderator.tag;
                } catch {
                    moderatorInfo = `<@${warning.moderator_id}>`;
                }

                embed.addFields({
                    name: `⚠️ Sanction #${warning.sanction_number}`,
                    value: `**Raison :** ${warning.reason}\n**Modérateur :** ${moderatorInfo}\n**Date :** <t:${timestamp}:F>`,
                    inline: false
                });
            }

            if (warnings.length > 10) {
                embed.setFooter({ text: `... et ${warnings.length - 10} autre(s) avertissement(s)` });
            }
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Erreur lors de la récupération des avertissements:', error);
        await interaction.reply('❌ Une erreur est survenue lors de la récupération des avertissements.');
    }
}
