import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { logModeration } from '../../utils/moderationLogger.ts';
import { addModerationHistory } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un utilisateur du serveur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur à expulser')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison de l\'expulsion')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const target = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) {
        await interaction.reply('Utilisateur invalide.');
        return;
    }

    // Vérifications de sécurité
    const member = interaction.member as GuildMember;
    const targetMember = interaction.guild.members.cache.get(target.id);

    if (!targetMember) {
        await interaction.reply('❌ Cet utilisateur n\'est pas sur le serveur.');
        return;
    }

    if (target.id === interaction.user.id) {
        await interaction.reply('❌ Vous ne pouvez pas vous expulser vous-même.');
        return;
    }

    if (target.id === interaction.client.user?.id) {
        await interaction.reply('❌ Je ne peux pas m\'expulser moi-même.');
        return;
    }

    if (member.roles.highest.position <= targetMember.roles.highest.position) {
        await interaction.reply('❌ Vous ne pouvez pas expulser cet utilisateur car il a un rôle égal ou supérieur au vôtre.');
        return;
    }

    if (!targetMember.kickable) {
        await interaction.reply('❌ Je ne peux pas expulser cet utilisateur (permissions insuffisantes).');
        return;
    }

    try {
        // Essayer d'envoyer un MP à l'utilisateur avant l'expulsion
        let dmSent = false;
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('👢 Vous avez été expulsé')
                .setDescription(`Vous avez été expulsé du serveur **${interaction.guild.name}**`)
                .addFields(
                    { name: '📝 Raison', value: reason, inline: false },
                    { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await target.send({ embeds: [dmEmbed] });
            dmSent = true;
        } catch (dmError) {
            console.log(`Impossible d'envoyer un MP à ${target.tag} (${target.id}):`, dmError);
            // Ne pas faire échouer le kick si le MP ne peut pas être envoyé
        }

        // Expulser l'utilisateur
        await targetMember.kick(`${reason} - Par ${interaction.user.tag}`);

        // Ajouter à l'historique de modération
        const sanctionNumber = await addModerationHistory(interaction.guild.id, target.id, interaction.user.id, 'kick', reason);

        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('👢 Utilisateur expulsé')
            .addFields(
                { name: '📋 Sanction N°', value: `#${sanctionNumber}`, inline: true },
                { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`},
                { name: '🛡️ Modérateur', value: interaction.user.tag},
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        // Indiquer si le MP a été envoyé
        embed.addFields({ 
            name: '💬 Message privé', 
            value: dmSent ? '✅ Envoyé' : '❌ Non envoyé', 
            inline: true 
        });

        await interaction.reply({ embeds: [embed] });

        // Logger l'action
        await logModeration(interaction.guild, 'Kick', target, interaction.user, reason, `Sanction #${sanctionNumber}`);

    } catch (error) {
        console.error('Erreur lors de l\'expulsion:', error);
        await interaction.reply('❌ Une erreur est survenue lors de l\'expulsion.');
    }
}
