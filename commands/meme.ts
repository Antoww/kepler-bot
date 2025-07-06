import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, Collection } from 'discord.js';

const subreddits = ['FrenchMemes', 'memesfrancais', 'memesfrancophones', 'france'];
const cooldowns = new Collection<string, number>();

export const data = new SlashCommandBuilder()
  .setName('meme')
  .setDescription('Affiche un meme francophone aléatoire.');

export async function execute(interaction: CommandInteraction) {
  // Vérification du cooldown (5 secondes)
  const userId = interaction.user.id;
  const cooldownTime = 5000; // 5 secondes en millisecondes
  const now = Date.now();
  
  if (cooldowns.has(userId)) {
    const timeLeft = cooldowns.get(userId)! + cooldownTime - now;
    if (timeLeft > 0) {
      const secondsLeft = Math.ceil(timeLeft / 1000);
      await interaction.reply({ 
        content: `⏰ Veuillez attendre ${secondsLeft} seconde(s) avant de réutiliser cette commande.`, 
        ephemeral: true 
      });
      return;
    }
  }
  
  // Mise à jour du cooldown
  cooldowns.set(userId, now);

  await interaction.deferReply();

  try {
    let meme = null;
    let attempts = 0;
    const maxAttempts = 10;

    // Boucle pour trouver un meme approprié
    while (!meme && attempts < maxAttempts) {
      const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
      const response = await fetch(`https://meme-api.com/gimme/${subreddit}`);

      if (!response.ok) {
        attempts++;
        continue;
      }

      const memeData = await response.json();
      
      // Vérifications de sécurité
      if (memeData.nsfw || 
          memeData.spoiler || 
          memeData.over_18 || 
          memeData.is_video || 
          !memeData.url || 
          memeData.url.includes('redgifs') ||
          memeData.url.includes('imgur.com/a/') ||
          memeData.url.includes('gallery')) {
        attempts++;
        continue;
      }

      // Vérification de la taille de l'image (éviter les images trop grandes)
      if (memeData.width && memeData.height) {
        const aspectRatio = memeData.width / memeData.height;
        if (aspectRatio > 3 || aspectRatio < 0.33) {
          attempts++;
          continue;
        }
      }

      meme = memeData;
    }

    if (!meme) {
      await interaction.editReply({ 
        content: "❌ Impossible de trouver un meme approprié après plusieurs tentatives. Veuillez réessayer plus tard." 
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(meme.title.length > 256 ? meme.title.substring(0, 253) + '...' : meme.title)
      .setImage(meme.url)
      .setURL(meme.postLink)
      .addFields(
        { name: '📊 Score', value: `👍 ${meme.ups}`, inline: true },
        { name: '💬 Commentaires', value: `💭 ${meme.numComments || 0}`, inline: true },
        { name: '🏷️ Subreddit', value: `r/${meme.subreddit}`, inline: true }
      )
      .setFooter({ 
        text: `Demandé par ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erreur lors de la récupération du meme:', error);
    await interaction.editReply({ 
      content: "❌ Une erreur s'est produite lors de la récupération du meme. Veuillez réessayer." 
    });
  }
}
