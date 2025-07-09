// Assure-toi d'avoir installé @discordjs/builders :
// deno add npm:@discordjs/builders
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

const RAID_MAPPING: Record<string, string> = {
  "liberation-of-undermine": "Libération de Terremine",
  "nerubar-palace": "Palais des Nerub'ar",
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
      try {
        const url = `https://raider.io/api/v1/guilds/profile?region=${region}&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(guild)}&fields=raid_progression,profile_url,faction,crest_url`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data: any = await resp.json();
          if (data && data.name) {
            return { data, url };
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la requête pour ${guild} sur ${realm}:`, error);
        continue;
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
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const nom = interaction.options.getString("nom", true);
  const serveur = interaction.options.getString("serveur", true);
  const region = interaction.options.getString("region")?.toLowerCase() || "eu";
  
  try {
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
    const faction = raiderData.faction === "alliance" ? "Alliance 🟦" : raiderData.faction === "horde" ? "Horde 🟥" : "?";
    const crest = (typeof raiderData.crest_url === "string" && /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)$/i.test(raiderData.crest_url)) ? raiderData.crest_url : null;

    // Progression raids TWW
    const raids = raiderData.raid_progression || {};
    const raidsTWW = RAID_KEYS
      .map(key => ({
        nom: RAID_MAPPING[key],
        progress: raids[key]?.summary || null,
      }))
      .filter(r => r.progress && r.progress !== "0/0");

    // Emojis décoratifs
    const emojiWoW = "🛡️";
    const emojiRaid = "🗡️";
    const emojiServeur = "🌍";
    const emojiRegion = "🌐";
    const emojiFaction = raiderData.faction === "alliance" ? "🟦" : raiderData.faction === "horde" ? "🟥" : "❔";

    // Construction de l'embed
    const embed = new EmbedBuilder()
      .setTitle(`🛡️ Guilde ${nomGuilde}`)
      .setDescription(`${emojiServeur} Serveur : **${serveur}**\n${emojiRegion} Région : **${region.toUpperCase()}**\n${emojiFaction} Faction : **${faction}**`)
      .setColor(raiderData.faction === "alliance" ? 0x0070dd : raiderData.faction === "horde" ? 0xc41e3a : 0xaaaaaa);

    if (raidsTWW.length > 0) {
      embed.addFields({
        name: `${emojiRaid} Progression raids The War Within`,
        value: raidsTWW.map(r => `• **${r.nom}** : ${r.progress}`).join("\n"),
      });
    } else {
      embed.addFields({ name: `${emojiRaid} Progression The War Within`, value: "Aucune progression trouvée." });
    }

    // Ajout de la section Liens utiles
    embed.addFields({
      name: "🔗 Liens utiles",
      value: `[Raider.IO](${lienRaider}) | [WowProgress](${wowpUrl})`
    });

    if (crest && crest.startsWith("http")) embed.setThumbnail(crest);

    // Footer avec heure, pp de l'utilisateur, nom et nombre de membres
    const now = new Date();
    const heure = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const userPp = interaction.user.displayAvatarURL?.() || undefined;
    const safeUserPp = (typeof userPp === "string" && userPp.startsWith("http")) ? userPp : undefined;
    const userName = interaction.user.globalName || interaction.user.username;
    const nbMembres = raiderData.member_count ? `• Membres : ${raiderData.member_count}` : "";
    embed.setFooter({
      text: `Exécuté à ${heure} par ${userName} ${nbMembres}`.trim(),
      iconURL: safeUserPp
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Erreur dans la commande wowguilde:", error);
    
    // Gestion d'erreur simplifiée
    const errorMessage = "❌ Une erreur s'est produite lors de l'exécution de la commande.";
    
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: errorMessage,
        ephemeral: true
      });
    } else {
      await interaction.editReply({
        content: errorMessage
      });
    }
  }
} 