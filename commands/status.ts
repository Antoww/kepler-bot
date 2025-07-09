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
        { name: 'Blizzard (Battle.net)', value: 'blizzard' },
      )
  );

function getColorFromIndicator(indicator: string) {
  if (indicator === 'none') return 0x43b581;
  if (indicator === 'minor') return 0xffa500;
  return 0xff0000;
}

export async function execute(interaction: CommandInteraction) {
  const service = interaction.options.get('service')?.value as string;
  await interaction.deferReply();

  let status = 'Inconnu';
  let color = 0xcccccc;
  let url = '';
  let details = '';
  let lien = '';
  let fields: any[] = [];

  try {
    if (service === 'discord') {
      // Statut global
      url = 'https://discordstatus.com/api/v2/status.json';
      const res = await fetch(url);
      const data = await res.json();
      status = data.status.description;
      color = getColorFromIndicator(data.status.indicator);
      details = `Statut global : **${data.status.description}**`;
      lien = 'https://discordstatus.com/';

      // Statut détaillé des composants
      const compRes = await fetch('https://discordstatus.com/api/v2/components.json');
      const compData = await compRes.json();
      const components = compData.components;
      // On sélectionne les composants principaux à afficher
      const principaux = [
        'API',
        'Media Proxy',
        'Push Notifications',
        'Search',
        'Voice',
        'Gateway',
        'CloudFlare',
        'Website',
        'CDN'
      ];
      for (const nom of principaux) {
        const comp = components.find((c: any) => c.name === nom);
        if (comp) {
          const emoji = comp.status === 'operational' ? '🟢' : (comp.status === 'degraded_performance' ? '🟠' : '🔴');
          fields.push({
            name: nom,
            value: `${emoji} ${comp.status.replace(/_/g, ' ')}`,
            inline: true
          });
        }
      }
      // Met en avant l'API Discord
      const apiComp = components.find((c: any) => c.name === 'API');
      if (apiComp) {
        details += `\n\n**État de l'API Discord :** ${apiComp.status === 'operational' ? '🟢 Opérationnel' : apiComp.status.replace(/_/g, ' ')}`;
      }
    } else if (service === 'steam') {
      status = 'Statut non disponible via API.';
      color = 0xffa500;
      details = 'Consulte le statut ici : [Steam Status](https://steamstat.us/)';
      lien = 'https://steamstat.us/';
    } else if (service === 'lol') {
      status = 'Non supporté pour le moment (API complexe).';
      color = 0xffa500;
      details = 'Tu peux consulter https://status.riotgames.com/';
      lien = 'https://status.riotgames.com/';
    } else if (service === 'fortnite') {
      status = 'Non supporté pour le moment (API complexe).';
      color = 0xffa500;
      details = 'Tu peux consulter https://status.epicgames.com/';
      lien = 'https://status.epicgames.com/';
    } else if (service === 'minecraft') {
      status = 'Statut non disponible via API.';
      color = 0xffa500;
      details = 'Consulte le statut ici : [Mojang Status](https://help.minecraft.net/hc/en-us/articles/4405233487892)';
      lien = 'https://help.minecraft.net/hc/en-us/articles/4405233487892';
    } else if (service === 'valorant') {
      status = 'Non supporté pour le moment (API complexe).';
      color = 0xffa500;
      details = 'Tu peux consulter https://status.riotgames.com/';
      lien = 'https://status.riotgames.com/';
    } else if (service === 'epicgames') {
      status = 'Non supporté pour le moment (API complexe).';
      color = 0xffa500;
      details = 'Tu peux consulter https://status.epicgames.com/';
      lien = 'https://status.epicgames.com/';
    } else if (service === 'blizzard') {
      status = 'Consulte le statut sur la page officielle.';
      color = 0x0099ff;
      details = 'Page officielle Blizzard : [Blizzard Status](https://bnetstatus.com/)';
      lien = 'https://bnetstatus.com/';
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
  if (lien) embed.setURL(lien);
  if (fields.length > 0) embed.addFields(fields);

  await interaction.editReply({ embeds: [embed] });
} 