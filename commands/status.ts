import { CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Affiche l\'état d\'un service ou jeu populaire')
  .addStringOption(option =>
    option.setName('service')
      .setDescription('Choisis un service ou jeu')
      .setRequired(true)
      .addChoices(
        { name: 'Discord', value: 'discord' },
        { name: 'Steam', value: 'steam' },
        { name: 'League of Legends', value: 'lol' },
        { name: 'Fortnite', value: 'fortnite' },
        { name: 'Minecraft', value: 'minecraft' },
        { name: 'Valorant', value: 'valorant' },
        { name: 'Epic Games', value: 'epicgames' },
      )
  );

export async function execute(interaction: CommandInteraction) {
  const service = interaction.options.get('service')?.value as string;
  await interaction.deferReply();

  let status = 'Inconnu';
  let color = 0xcccccc;
  let url = '';
  let details = '';

  try {
    if (service === 'discord') {
      url = 'https://discordstatus.com/api/v2/status.json';
      const res = await fetch(url);
      const data = await res.json();
      status = data.status.description;
      color = data.status.indicator === 'none' ? 0x43b581 : (data.status.indicator === 'minor' ? 0xffa500 : 0xff0000);
      details = `Statut global : **${data.status.description}**`;
    } else if (service === 'steam') {
      url = 'https://crowbar.steamstat.us/Barney';
      const res = await fetch(url);
      const data = await res.json();
      const steamStatus = data.services.SteamCommunity.online ? 'En ligne' : 'Hors ligne';
      status = steamStatus;
      color = data.services.SteamCommunity.online ? 0x43b581 : 0xff0000;
      details = `Steam Community : **${steamStatus}**`;
    } else if (service === 'lol') {
      status = 'Non supporté pour le moment (API complexe).';
      color = 0xffa500;
      details = 'Tu peux consulter https://status.riotgames.com/';
    } else if (service === 'fortnite') {
      status = 'Non supporté pour le moment (API complexe).';
      color = 0xffa500;
      details = 'Tu peux consulter https://status.epicgames.com/';
    } else if (service === 'minecraft') {
      url = 'https://status.mojang.com/check';
      const res = await fetch(url);
      const data = await res.json();
      const mojangStatus = data.find((s: any) => s['minecraft.net'])?.['minecraft.net'] || 'unknown';
      status = mojangStatus === 'green' ? 'En ligne' : (mojangStatus === 'yellow' ? 'Instable' : 'Hors ligne');
      color = mojangStatus === 'green' ? 0x43b581 : (mojangStatus === 'yellow' ? 0xffa500 : 0xff0000);
      details = `minecraft.net : **${status}**`;
    } else if (service === 'valorant') {
      status = 'Non supporté pour le moment (API complexe).';
      color = 0xffa500;
      details = 'Tu peux consulter https://status.riotgames.com/';
    } else if (service === 'epicgames') {
      status = 'Non supporté pour le moment (API complexe).';
      color = 0xffa500;
      details = 'Tu peux consulter https://status.epicgames.com/';
    }
  } catch (err: any) {
    status = 'Erreur lors de la récupération du statut.';
    color = 0xff0000;
    details = err.message || err;
  }

  const embed = new EmbedBuilder()
    .setTitle(`État du service : ${interaction.options.get('service')?.name}`)
    .setDescription(details)
    .setColor(color)
    .setFooter({ text: 'Données publiques ou officielles' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
} 