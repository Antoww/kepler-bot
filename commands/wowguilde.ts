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

// Mapping noms internes -> noms français (TWW)
const RAID_FR: Record<string, string> = {
  "nerub-ar-palace": "Palais des Nerub’ar",
  "liberation-of-terremine": "La Libération de Terremine"
};

// Liste des raids de l'extension en cours (The War Within)
const RAIDS_TWW = [
  "nerub-ar-palace",
  "liberation-of-terremine"
];

export async function execute(interaction: CommandInteraction) {
  const nom = interaction.options.get("nom")?.value as string;
  const serveur = interaction.options.get("serveur")?.value as string;
  const region = interaction.options.get("region")?.value as string;

  // Réponse publique
  await interaction.reply({ content: `🔎 Recherche des infos pour la guilde **${nom}** sur **${serveur}** (${region})...`, ephemeral: false });

  try {
    // Appel à l'API Raider.IO
    const url = `https://raider.io/api/v1/guilds/profile?region=${encodeURIComponent(region)}&realm=${encodeURIComponent(serveur)}&name=${encodeURIComponent(nom)}&fields=raid_progression,raid_rank,members`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Guilde introuvable ou erreur API Raider.IO.");
    const data = await response.json();

    // Affichage debug des clés raids pour vérifier la correspondance
    if (data.raid_progression) {
      console.log('Clés raids Raider.IO:', Object.keys(data.raid_progression));
    }
    // Avancement PvE (raids sortis de l'extension en cours, nom FR)
    let avancements = [];
    if (data.raid_progression) {
      for (const raidKey of RAIDS_TWW) {
        const raidData = data.raid_progression[raidKey];
        if (!raidData) continue;
        // On ignore les raids à 0/0 ou sans résumé
        if (!raidData.summary || raidData.summary.match(/^0\s*\/\s*0/)) continue;
        const raidName = RAID_FR[raidKey] || (raidData.name ? raidData.name : raidKey);
        const raidSummary = raidData.summary || 'Non disponible';
        avancements.push(`• **${raidName}** : ${raidSummary}`);
      }
    }
    let avancement = avancements.length > 0 ? avancements.join('\n') : 'Aucun raid trouvé pour cette extension.';

    // Thumbnail (logo de la guilde si dispo, sinon rien)
    let thumbnail = undefined;
    if (data.profile_banner_url && typeof data.profile_banner_url === 'string' && data.profile_banner_url.startsWith('http')) {
      thumbnail = data.profile_banner_url;
    }

    // Faction
    const faction = data.faction ? (data.faction === 'alliance' ? 'Alliance 🟦' : 'Horde 🟥') : 'Inconnue';
    // Nombre de membres
    const nbMembres = data.members ? data.members.length : "?";
    // Classement serveur (Raider.IO)
    let classement = "Non classée";
    let dernierRaidName = null;
    if (data.raid_progression) {
      const raidKeys = Object.keys(data.raid_progression);
      if (raidKeys.length > 0) {
        dernierRaidName = raidKeys[raidKeys.length - 1];
        if (data.raid_rank && data.raid_rank[dernierRaidName] && data.raid_rank[dernierRaidName].realm) {
          classement = `#${data.raid_rank[dernierRaidName].realm}`;
        }
      }
    }
    // Récupération du classement WowProgress (JSON puis HTML)
    const wowp = await fetchWowProgressRank(region, serveur, nom);
    const classementWowProgress = wowp.rank;
    const classementWowProgressUrl = wowp.url;
    // Lien Raider.IO
    const lienRaiderIO = data.profile_url || `https://raider.io/guild/${region}/${encodeURIComponent(serveur)}/${encodeURIComponent(nom)}`;
    // Lien Armurerie Blizzard
    const lienArmurerie = `https://worldofwarcraft.com/${region}/guild/${slugify(serveur)}/${slugify(nom)}`;

    // Création de l'embed amélioré
    const embed = new EmbedBuilder()
      .setTitle(`🛡️ Guilde : ${data.name || nom}`)
      .setDescription(`**Serveur :** ${data.realm || serveur} (${(data.region || region).toUpperCase()})`)
      .setColor(0x1a2634)
      .addFields(
        { name: "👥 Membres", value: `${nbMembres}`, inline: true },
        { name: "⚔️ Faction", value: faction, inline: true },
        { name: "📊 Classement serveur (Raider.IO)", value: classement, inline: true },
        { name: "🌍 Classement serveur (WowProgress)", value: classementWowProgress ? `[${classementWowProgress}](${classementWowProgressUrl})` : `[Non trouvé](${classementWowProgressUrl})`, inline: true },
        { name: "🏆 Avancement PvE (The War Within)", value: avancement, inline: false },
        { name: "🔗 Lien Raider.IO", value: `[Voir sur Raider.IO](${lienRaiderIO})`, inline: true },
        { name: "🔗 Armurerie Blizzard", value: `[Voir sur l'armurerie](${lienArmurerie})`, inline: true }
      )
      .setFooter({ text: "Sources : Raider.IO & WowProgress" });
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (classementWowProgressUrl) embed.setURL(classementWowProgressUrl);

    await interaction.editReply({ content: null, embeds: [embed] });
  } catch (err: any) {
    await interaction.editReply({ content: `❌ Erreur : ${err.message || err}` });
  }
} 