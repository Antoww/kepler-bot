// Assure-toi d'avoir installé @discordjs/builders :
// deno add npm:@discordjs/builders
import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from "discord.js";
import { SlashCommandBuilder } from "npm:@discordjs/builders";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wowguilde")
    .setDescription("Affiche les infos d'une guilde World of Warcraft (membres, avancement, classement)")
    .addStringOption((option: any) =>
      option.setName("nom")
        .setDescription("Nom de la guilde")
        .setRequired(true)
    )
    .addStringOption((option: any) =>
        option.setName("region")
          .setDescription("Région (ex: eu, us)")
          .setRequired(true)
      )
    .addStringOption((option: any) =>
      option.setName("serveur")
        .setDescription("Nom du serveur")
        .setRequired(true)
    ),

  async execute(interaction: CommandInteraction) {
    const nom = interaction.options.get("nom")?.value as string;
    const serveur = interaction.options.get("serveur")?.value as string;
    const region = interaction.options.get("region")?.value as string;

    await interaction.reply({ content: `Recherche des infos pour la guilde **${nom}** sur **${serveur}** (${region})...`, ephemeral: true });

    try {
      // Appel à l'API Raider.IO
      const url = `https://raider.io/api/v1/guilds/profile?region=${encodeURIComponent(region)}&realm=${encodeURIComponent(serveur)}&name=${encodeURIComponent(nom)}&fields=raid_progression,raid_rank,members`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Guilde introuvable ou erreur API.");
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

      // Création de l'embed
      const embed = new EmbedBuilder()
        .setTitle(`Guilde : ${data.name}`)
        .setDescription(`Serveur : ${data.realm} (${data.region.toUpperCase()})`)
        .setColor(0x0099ff)
        .addFields(
          { name: "Nombre de membres", value: `${nbMembres}`, inline: true },
          { name: "Avancement PvE", value: avancement, inline: true },
          { name: "Classement serveur", value: classement, inline: true }
        )
        .setFooter({ text: "Données Raider.IO" });

      await interaction.editReply({ content: null, embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ content: `Erreur : ${err.message || err}` });
    }
  }
}; 