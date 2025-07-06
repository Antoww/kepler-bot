import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('golem')
  .setDescription('Affiche un golem aléatoire depuis le SRD D&D.');

export async function execute(interaction: CommandInteraction) {
  const listRes = await fetch('https://www.dnd5eapi.co/api/monsters?name=golem');
  if (!listRes.ok) {
    await interaction.reply({ content: "Impossible de récupérer un golem.", ephemeral: true });
    return;
  }

  const list = await listRes.json();
  const golems = list.results;
  if (!golems || golems.length === 0) {
    await interaction.reply({ content: "Aucun golem trouvé.", ephemeral: true });
    return;
  }

  const random = golems[Math.floor(Math.random() * golems.length)];
  const detailRes = await fetch(`https://www.dnd5eapi.co${random.url}`);
  if (!detailRes.ok) {
    await interaction.reply({ content: "Impossible de récupérer les détails du golem.", ephemeral: true });
    return;
  }

  const details = await detailRes.json();

  const embed = new EmbedBuilder()
    .setColor('#9b59b6')
    .setTitle(details.name)
    .setDescription(`${details.size} ${details.type} - ${details.alignment}`)
    .addFields(
      { name: 'Points de vie', value: details.hit_points.toString(), inline: true },
      { name: 'Niveau de défi', value: details.challenge_rating.toString(), inline: true }
    )
    .setFooter({ text: 'Source: D&D 5e API' });

  await interaction.reply({ embeds: [embed] });
}
