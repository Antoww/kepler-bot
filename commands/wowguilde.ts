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
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const nom = interaction.options.getString("nom", true);
  const serveur = interaction.options.getString("serveur", true);
  await interaction.deferReply({ ephemeral: false });

  // Formatage pour API
  const region = "eu"; // Peut être adapté si besoin
  const realm = serveur.replace(/ /g, "-").toLowerCase();
  const guild = nom.replace(/ /g, "-").toLowerCase();

  // URLs API
  const raiderUrl = `https://raider.io/api/v1/guilds/profile?region=${region}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(guild)}&fields=raid_progression,raid_rankings,profile_url,member_count,faction,crest_url`;
  const wowpUrl = `https://www.wowprogress.com/guild/${region.toUpperCase()}/${encodeURIComponent(serveur.replace(/ /g, "-"))}/${encodeURIComponent(nom.replace(/ /g, "-"))}`;
  const armoryUrl = `https://worldofwarcraft.blizzard.com/fr-fr/guild/${region}/${encodeURIComponent(realm)}/${encodeURIComponent(guild)}`;

  let raiderData: any = null;
  let wowpHtml: string | null = null;
  let classementWowp: string | null = null;
  let erreur = false;
  let erreurMsg = "";

  // Récupération Raider.IO
  try {
    const resp = await fetch(raiderUrl);
    if (!resp.ok) throw new Error("Guilde introuvable sur Raider.IO");
    raiderData = await resp.json();
  } catch (e: any) {
    erreur = true;
    erreurMsg = `Erreur Raider.IO : ${e.message}`;
  }

  // Récupération WowProgress (classement serveur)
  try {
    const resp = await fetch(wowpUrl);
    if (resp.ok) {
      wowpHtml = await resp.text();
      if (wowpHtml) { // Correction : wowpHtml peut être null
        // Extraction du classement serveur (regex sur la page HTML)
        const match = wowpHtml.match(/Server Rank:\s*#(\d+)/i);
        if (match) classementWowp = `#${match[1]}`;
      }
    }
  } catch (e) {
    // Silencieux, pas bloquant
  }

  if (erreur || !raiderData) {
    await interaction.editReply({
      content: `❌ Impossible de récupérer les infos de la guilde. ${erreurMsg}`
    });
    return;
  }

  // Infos de base
  const nomGuilde = raiderData.name || nom;
  const faction = raiderData.faction === "alliance" ? "Alliance" : raiderData.faction === "horde" ? "Horde" : "?";
  const membres = raiderData.member_count || "?";
  const crest = raiderData.crest_url && raiderData.crest_url.startsWith("http") ? raiderData.crest_url : null;
  const lienRaider = raiderData.profile_url || raiderUrl;

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