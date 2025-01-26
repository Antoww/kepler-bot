import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, ChannelType, type CacheType, GuildChannel, type GuildBasedChannel } from 'discord.js';
import dayjs from 'dayjs';
import 'https://cdn.skypack.dev/dayjs@1.11.13/locale/fr';
dayjs.locale('fr');


export const data = new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Donne des informations sur un canal.')
    .addChannelOption(option => option.setName('canal')
        .setDescription('Mentionnez un canal, entrez une ID de canal ou écrivez le nom du canal')
        .setRequired(true));
export async function execute(interaction: CommandInteraction) {
    let channel = interaction.options.get('canal')!.channel!;

    if (!interaction.guild) {
        interaction.reply('Erreur : Vous devez être sur un serveur Discord.')
        return;
    }

    if (!(channel instanceof GuildChannel)) {
        const fetchedChannel = await interaction.client.channels.fetch(channel.id) as GuildBasedChannel;
        if (fetchedChannel.isDMBased()) {
            interaction.reply('Erreur : Vous ne pouvez pas obtenir des informations sur un canal privé.')
            return;
        }

        channel = fetchedChannel;
    }


    sendChannelInfo(interaction, channel, false);
}


function getChannelTypeName(type: ChannelType) {
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

async function sendChannelInfo(interaction: CommandInteraction<CacheType>, channel: GuildBasedChannel, isUpdate: boolean) {
    const dateChannel = dayjs(channel.createdAt).format('DD/MM/YYYY à HH:mm:ss');

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Channel Info')
        .addFields(
            { name: 'Nom du canal :', value: `${channel.name}`, inline: true },
            { name: 'ID :', value: `${channel.id}`, inline: true },
            { name: 'Type :', value: `${getChannelTypeName(channel.type)}`, inline: true },
            { name: 'Créé le :', value: `${dateChannel}`, inline: true },
            { name: 'NSFW :', value: `${channel.isTextBased() && !channel.isThread() && channel.nsfw ? 'Oui' : 'Non'}`, inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: true })
        })
        .setTimestamp();

    if (isUpdate) {
        await interaction.editReply({ embeds: [embed] });
    } else {
        await interaction.reply({ embeds: [embed] });
    }
}