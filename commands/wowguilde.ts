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

// Tente de trouver la guilde sur Raider.IO en testant plusieurs variantes
async function tryFetchGuild(region: string, realmVariants: string[], guildVariants: string[]) {
  for (const realm of realmVariants) {
    for (const guild of guildVariants) {
      const url = `https://raider.io/api/v1/guilds/profile?region=${region}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(guild)}&fields=raid_progression,profile_url,faction,crest_url`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data: any = await resp.json();
        if (data && data.name) {
          return { data, url };
        }
      }
    }
  }
  return { data: null, url: null };
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

  // Recherche Raider.IO
  const { data: raiderData, url: foundUrl }: { data: any, url: string|null } = await tryFetchGuild(region, realmVariants, guildVariants);

  // Génération des liens utiles
  const wowpUrl = `https://www.wowprogress.com/guild/${region.toUpperCase()}/${encodeURIComponent(serveur.replace(/ /g, "-"))}/${encodeURIComponent(nom.replace(/ /g, "-"))}`;
  const lienRaider = raiderData?.profile_url || foundUrl || "https://raider.io/";

  if (!raiderData) {
    await interaction.editReply({
      content: `❌ Impossible de trouver la guilde sur Raider.IO. Vérifie l'orthographe ou la région.`
    });
    return;
  }

  // Infos de base
  const nomGuilde = raiderData.name || nom;
  const faction = raiderData.faction === "alliance" ? "Alliance" : raiderData.faction === "horde" ? "Horde" : "?";
  const crest = (typeof raiderData.crest_url === "string" && /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)$/i.test(raiderData.crest_url)) ? raiderData.crest_url : null;

  // Progression raids TWW
  const raids = raiderData.raid_progression || {};
  const raidsTWW = RAID_KEYS
    .map(key => ({
      nom: RAID_MAPPING[key],
      progress: raids[key]?.summary || null,
    }))
    .filter(r => r.progress && r.progress !== "0/0");

  // Construction de l'embed
  const embed = new EmbedBuilder()
    .setTitle(`Guilde ${nomGuilde}`)
    .setDescription(`Serveur : **${serveur}**\nRégion : **${region.toUpperCase()}**\nFaction : **${faction}**`)
    .setColor(faction === "Alliance" ? 0x0070dd : faction === "Horde" ? 0xc41e3a : 0xaaaaaa)
    .setFooter({ text: `Raider.IO : ${lienRaider} | WowProgress : ${wowpUrl}` });

  if (raidsTWW.length > 0) {
    embed.addFields({
      name: `Progression raids The War Within`,
      value: raidsTWW.map(r => `• **${r.nom}** : ${r.progress}`).join("\n"),
    });
  } else {
    embed.addFields({ name: "Progression raids The War Within", value: "Aucune progression trouvée." });
  }

  if (crest) embed.setThumbnail(crest);

  await interaction.editReply({ embeds: [embed] });
} 