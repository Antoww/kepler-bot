// Assure-toi d'avoir installé @discordjs/builders :
// deno add npm:@discordjs/builders
import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js";
import { SlashCommandBuilder } from "npm:@discordjs/builders";

export const data = new SlashCommandBuilder()
  .setName("wowguilde")
  .setDescription("Affiche les infos d'une guilde World of Warcraft (membres, avancement, classement)")
  .addStringOption((option: any) =>
    option.setName("nom")
      .setDescription("Nom de la guilde")
      .setRequired(true)
  )
  .addStringOption((option: any) =>
    option.setName("serveur")
      .setDescription("Nom du serveur")
      .setRequired(true)
  )
  .addStringOption((option: any) =>
    option.setName("region")
      .setDescription("Région (ex: eu, us)")
      .setRequired(true)
  );

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function fetchWowProgressRank(region: string, serveur: string, nom: string): Promise<{rank: string|null, url: string}> {
  const slugServeur = slugify(serveur);
  const slugNom = slugify(nom);
  const wowpUrl = `https://www.wowprogress.com/guild/${region}/${slugServeur}/${slugNom}/json_rank`;
  const pageUrl = `https://www.wowprogress.com/guild/${region}/${slugServeur}/${slugNom}`;
  try {
    const resWP = await fetch(wowpUrl);
    if (resWP.ok) {
      const dataWP = await resWP.json();
      if (dataWP && dataWP.realm_rank) {
        return { rank: `#${dataWP.realm_rank}`, url: pageUrl };
      }
    }
  } catch {}
  // Si pas de JSON, on tente de parser la page HTML
  try {
    const resHTML = await fetch(pageUrl);
    if (resHTML.ok) {
      const html = await resHTML.text();
      const match = html.match(/<div[^>]*class="rank[^>]*>\s*Realm Rank:\s*<span[^>]*>(#[0-9]+)<\/span>/i);
      if (match && match[1]) {
        return { rank: match[1], url: pageUrl };
      }
    }
  } catch {}
  return { rank: null, url: pageUrl };
}

export async function execute(interaction: CommandInteraction) {
  const nom = interaction.options.get("nom")?.value as string;
  const serveur = interaction.options.get("serveur")?.value as string;
  const region = interaction.options.get("region")?.value as string;

  await interaction.reply({ content: `🔎 Recherche des infos pour la guilde **${nom}** sur **${serveur}** (${region})...`, ephemeral: true });

  let classementWowProgress = null;
  let classementWowProgressUrl = null;

  try {
    // Appel à l'API Raider.IO
    const url = `https://raider.io/api/v1/guilds/profile?region=${encodeURIComponent(region)}&realm=${encodeURIComponent(serveur)}&name=${encodeURIComponent(nom)}&fields=raid_progression,raid_rank,members`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Guilde introuvable ou erreur API Raider.IO.");
    const data = await response.json();

    // Nombre de membres
    const nbMembres = data.members ? data.members.length : "?";
    // Avancement PvE (dernier raid de l'extension)
    let avancement = "Non disponible";
    let classement = "Non classée";
    let dernierRaidName = null;
    if (data.raid_progression) {
      const raidKeys = Object.keys(data.raid_progression);
      if (raidKeys.length > 0) {
        dernierRaidName = raidKeys[raidKeys.length - 1];
        const dernierRaid = data.raid_progression[dernierRaidName];
        avancement = dernierRaid && dernierRaid.summary ? `${dernierRaid.summary}` : "Non disponible";
        if (data.raid_rank && data.raid_rank[dernierRaidName] && data.raid_rank[dernierRaidName].realm) {
          classement = `#${data.raid_rank[dernierRaidName].realm}`;
        }
      }
    }

    // Récupération du classement WowProgress (JSON puis HTML)
    const wowp = await fetchWowProgressRank(region, serveur, nom);
    classementWowProgress = wowp.rank;
    classementWowProgressUrl = wowp.url;

    // Thumbnail (logo WoW)
    const thumbnail = 'https://static.wikia.nocookie.net/wowpedia/images/6/6b/WoW_icon.png';

    // Création de l'embed amélioré
    const embed = new EmbedBuilder()
      .setTitle(`🛡️ Guilde : ${data.name}`)
      .setDescription(`**Serveur :** ${data.realm} (${data.region.toUpperCase()})`)
      .setColor(0x1a2634)
      .setThumbnail(thumbnail)
      .addFields(
        { name: "👥 Membres", value: `${nbMembres}`, inline: true },
        { name: "🏆 Avancement PvE", value: avancement, inline: true },
        { name: "📊 Classement serveur (Raider.IO)", value: classement, inline: true },
        { name: "🌍 Classement serveur (WowProgress)", value: classementWowProgress ? `[${classementWowProgress}](${classementWowProgressUrl})` : `[Non trouvé](${classementWowProgressUrl})`, inline: true }
      )
      .setFooter({ text: "Sources : Raider.IO & WowProgress", iconURL: thumbnail });
    if (classementWowProgressUrl) embed.setURL(classementWowProgressUrl);

    await interaction.editReply({ content: null, embeds: [embed] });
  } catch (err: any) {
    await interaction.editReply({ content: `❌ Erreur : ${err.message || err}` });
  }
} 