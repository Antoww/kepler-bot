import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("minecraft-uuid")
    .setDescription("Donne l'UUID d'un joueur Minecraft.")
    .addStringOption(option =>
        option.setName("username")
            .setDescription("Le nom d'utilisateur du joueur Minecraft.")
            .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
  const username = interaction.options.get("username")?.value as string;
  const uuid = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`)
    .then((res) => res.json())
    .then((data) => data.id);

  const embed = new EmbedBuilder()
  
    .setAuthor({ name: interaction.client.user?.username, iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) })
    .setColor('LuminousVividPink')
    .addFields(
        { name: "Nom d'utilisateur", value: username, inline: true },
        { name: "UUID", value: uuid, inline: true }
    )
    .setFooter({
        text: 'Demandé par ' + interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
    })

    .setTimestamp();

  interaction.reply({ embeds: [embed] });
}