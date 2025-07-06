import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const subreddits = ['FrenchMemes', 'memesfrancais', 'memesfrancophones', 'france'];

export const data = new SlashCommandBuilder()
  .setName('meme')
  .setDescription('Affiche un meme francophone aléatoire.');

export async function execute(interaction: CommandInteraction) {
  const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
  const response = await fetch(`https://meme-api.com/gimme/${subreddit}`);

  if (!response.ok) {
    await interaction.reply({ content: "Impossible de récupérer un meme.", ephemeral: true });
    return;
  }

  const meme = await response.json();

  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(meme.title)
    .setImage(meme.url)
    .setURL(meme.postLink)
    .setFooter({ text: `r/${meme.subreddit} | 👍 ${meme.ups}` });

  await interaction.reply({ embeds: [embed] });
}
