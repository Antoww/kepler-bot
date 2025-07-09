// Assure-toi d'avoir installé @discordjs/builders :
// deno add npm:@discordjs/builders
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import fetch from "npm:node-fetch";

const RAID_MAPPING: Record<string, string> = {
  "blackrock-depths": "Profondeurs de Rochenoire",
  "liberation-of-undermine": "Libération d'Undermine",
  "manaforge-omega": "Manaforge Oméga",
  "nerubar-palace": "Palais nérubien",
};
const RAID_KEYS = Object.keys(RAID_MAPPING);

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function tryFetchGuild(region: string, realmVariants: string[], guildVariants: string[]) {
  const tested: string[] = [];
  for (const realm of realmVariants) {
    for (const guild of guildVariants) {
      const url = `https://raider.io/api/v1/guilds/profile?region=${region}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(guild)}&fields=raid_progression,raid_rankings,profile_url,member_count,faction,crest_url`;
      tested.push(url);
      const resp = await fetch(url);
      if (resp.ok) {
        const data: any = await resp.json();
        if (data && data.name) {
          return { data, url, tested };
        }
      }
    }
  }
  return { data: null, url: null, tested };
}

export const data = new SlashCommandBuilder()
  .setName("wowguilde")
  .setDescription("Affiche les infos d'une guilde World of Warcraft (The War Within)")
  .addStringOption(option =>
    option.setName("nom")
      .setDescription("Nom exact de la guilde")
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName("serveur")
      .setDescription("Nom du serveur (ex: Ysondre)")
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName("region")
      .setDescription("Région (eu, us, kr, tw). Par défaut : eu")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const nom = interaction.options.getString("nom", true);
  const serveur = interaction.options.getString("serveur", true);
  const region = interaction.options.getString("region")?.toLowerCase() || "eu";
  await interaction.deferReply({ ephemeral: false });

  // Générer des variantes pour maximiser les chances
  const realmVariants = [
    serveur,
    serveur.replace(/ /g, "-"),
    serveur.replace(/ /g, "").toLowerCase(),
    slugify(serveur),
    serveur.toLowerCase(),
  ];
  const guildVariants = [
    nom,
    nom.replace(/ /g, "-"),
    nom.replace(/ /g, "").toLowerCase(),
    slugify(nom),
    nom.toLowerCase(),
  ];

  // Essayer toutes les variantes
  const { data: raiderData, url: foundUrl, tested }: { data: any, url: string|null, tested: string[] } = await tryFetchGuild(region, realmVariants, guildVariants);

  // Récupération WowProgress (classement serveur)
  const wowpUrl = `https://www.wowprogress.com/guild/${region.toUpperCase()}/${encodeURIComponent(serveur.replace(/ /g, "-"))}/${encodeURIComponent(nom.replace(/ /g, "-"))}`;
  let wowpHtml: string | null = null;
  let classementWowp: string | null = null;
  try {
    const resp = await fetch(wowpUrl);
    if (resp.ok) {
      wowpHtml = await resp.text();
      if (wowpHtml) {
        const match = wowpHtml.match(/Server Rank:\s*#(\d+)/i);
        if (match) classementWowp = `#${match[1]}`;
      }
    }
  } catch {}

  if (!raiderData) {
    await interaction.editReply({
      content: `❌ Impossible de trouver la guilde sur Raider.IO après avoir testé plusieurs variantes.\nVariantes testées :\n${tested.map(u => '`' + u + '`').join('\n')}`
    });
    return;
  }

  // Infos de base
  const nomGuilde = raiderData.name || nom;
  const faction = raiderData.faction === "alliance" ? "Alliance" : raiderData.faction === "horde" ? "Horde" : "?";
  const membres = raiderData.member_count || "?";
  const crest = raiderData.crest_url && raiderData.crest_url.startsWith("http") ? raiderData.crest_url : null;
  const lienRaider = raiderData.profile_url || foundUrl;
  const armoryUrl = `https://worldofwarcraft.blizzard.com/fr-fr/guild/${region}/${encodeURIComponent(realmVariants[0].replace(/ /g, "-").toLowerCase())}/${encodeURIComponent(guildVariants[0].replace(/ /g, "-").toLowerCase())}`;

  // Progression raids TWW
  const raids = raiderData.raid_progression || {};
  const raidsTWW = RAID_KEYS
    .map(key => ({
      key,
      nom: RAID_MAPPING[key],
      progress: raids[key]?.summary || null,
      ranking: raiderData.raid_rankings?.[key]?.world || null,
      rankingServer: raiderData.raid_rankings?.[key]?.realm || null,
    }))
    .filter(r => r.progress && r.progress !== "0/0");

  // Construction de l'embed
  const embed = new EmbedBuilder()
    .setTitle(`Guilde ${nomGuilde} (${serveur})`)
    .setDescription(`Faction : **${faction}**\nMembres : **${membres}**`)
    .setColor(faction === "Alliance" ? 0x0070dd : faction === "Horde" ? 0xc41e3a : 0xaaaaaa)
    .setURL(lienRaider)
    .addFields(
      { name: "Classement serveur (WowProgress)", value: classementWowp || "Non trouvé", inline: true },
      { name: "Classement serveur (Raider.IO)", value: raidsTWW.length > 0 && raidsTWW[0].rankingServer ? `#${raidsTWW[0].rankingServer}` : "Non trouvé", inline: true },
      { name: "Liens utiles", value: `[Raider.IO](${lienRaider}) | [Armurerie](${armoryUrl}) | [WowProgress](${wowpUrl})` }
    );

  if (raidsTWW.length > 0) {
    embed.addFields({
      name: `Progression raids The War Within`,
      value: raidsTWW.map(r => `**${r.nom}** : ${r.progress} (Serveur: ${r.rankingServer ? `#${r.rankingServer}` : "?"}, Monde: ${r.ranking ? `#${r.ranking}` : "?"})`).join("\n"),
    });
  } else {
    embed.addFields({ name: "Progression raids The War Within", value: "Aucune progression trouvée." });
  }

  if (crest) embed.setThumbnail(crest);

  await interaction.editReply({ embeds: [embed] });
} 