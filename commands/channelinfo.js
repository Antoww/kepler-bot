import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import dayjs from 'dayjs';
import 'https://cdn.skypack.dev/dayjs@1.11.13/locale/fr';
dayjs.locale('fr');
const file = 'channelinfo.js';

export const data = new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Donne des informations sur un canal.')
    .addStringOption(option => option.setName('canal')
        .setDescription('Mentionnez un canal, entrez une ID de canal ou écrivez le nom du canal')
        .setRequired(true));
export async function execute(interaction) {
    const channelInput = interaction.options.getString('canal');
    let channel;

    // Try to fetch the channel by ID or mention
    try {
        channel = await interaction.guild.channels.fetch(channelInput.replace(/[<#>]/g, ''));
    // deno-lint-ignore no-unused-vars
    } catch (error) {
        // If not found by ID or mention, search by name
        const channels = interaction.guild.channels.cache.filter(ch => ch.name === channelInput);
        if (channels.size === 1) {
            channel = channels.first();
        } else if (channels.size > 1) {
            // If multiple channels found, prompt user to choose
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Sélectionnez un canal')
                .setDescription('Plusieurs canaux ont été trouvés avec ce nom. Veuillez choisir le canal souhaité.');

            const row = new ActionRowBuilder();
            channels.forEach((ch, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`channel_${ch.id}`)
                        .setLabel(`${index + 1}`)
                        .setStyle(ButtonStyle.Primary)
                );
                embed.addFields({ name: `Option ${index + 1}`, value: `${ch.name} (${ch.id})`, inline: true });
            });

            await interaction.reply({ embeds: [embed], components: [row] });

            const filter = i => i.customId.startsWith('channel_') && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async (i) => {
                const selectedChannelId = i.customId.split('_')[1];
                channel = await interaction.guild.channels.fetch(selectedChannelId);
                collector.stop();
                await i.update({ content: `Canal sélectionné : ${channel.name}`, components: [], embeds: [] });
                sendChannelInfo(interaction, channel, true);
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: 'Temps écoulé. Veuillez réessayer.', components: [], embeds: [] });
                }
            });

            return;
        } else {
            await interaction.reply({ content: 'Aucun canal trouvé avec ce nom.', ephemeral: true });
            return;
        }
    }

    sendChannelInfo(interaction, channel, false);
}


function getChannelTypeName(type) {
    switch (type) {
        case ChannelType.AnnouncementThread:
            return 'News Thread';
        case ChannelType.DM:
            return 'DM';
        case ChannelType.GroupDM:
            return 'Group DM';
        case ChannelType.GuildAnnouncement:
            return 'News';
        case ChannelType.GuildCategory:
            return 'Category';
        case ChannelType.GuildDirectory:
            return 'Directory';
        case ChannelType.GuildForum:
            return 'Forum';
        case ChannelType.GuildMedia:
            return 'Media';
        case ChannelType.GuildStageVoice:
            return 'Stage Voice';
        case ChannelType.GuildText:
            return 'Text';
        case ChannelType.GuildVoice:
            return 'Voice';
        case ChannelType.PrivateThread:
            return 'Private Thread';
        case ChannelType.PublicThread:
            return 'Public Thread';
    }
}

async function sendChannelInfo(interaction, channel, isUpdate) {
    const dateChannel = dayjs(channel.createdAt).format('DD/MM/YYYY à HH:mm:ss');

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Channel Info')
        .addFields(
            { name: 'Nom du canal :', value: `${channel.name}`, inline: true },
            { name: 'ID :', value: `${channel.id}`, inline: true },
            { name: 'Type :', value: `${getChannelTypeName(channel.type)}`, inline: true },
            { name: 'Créé le :', value: `${dateChannel}`, inline: true },
            { name: 'NSFW :', value: `${channel.nsfw ? 'Oui' : 'Non'}`, inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();

    if (isUpdate) {
        await interaction.editReply({ embeds: [embed] });
    } else {
        await interaction.reply({ embeds: [embed] });
    }
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${file} executée par ${interaction.user.tag} (${interaction.user.id})`);
}