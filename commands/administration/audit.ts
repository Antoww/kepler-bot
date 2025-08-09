import {
  type CommandInteraction,
  SlashCommandBuilder,
  type SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import {
  getLogChannel,
  getBirthdayChannel,
  getModerationChannel,
  getMuteRole,
} from '../../database/db.ts';

export const data = new SlashCommandBuilder()
  .setName('audit')
  .setDescription('Audit de la configuration du serveur')
  .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName('channel')
      .setDescription('Vérifie les canaux configurés (logs, anniversaires, modération)')
  )
  .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName('roles')
      .setDescription('Vérifie la configuration des rôles (mute, permissions)')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
    return;
  }

  const sub = (interaction as unknown as ChatInputCommandInteraction).options.getSubcommand();
  const me = interaction.guild.members.me;

  if (!me) {
    await interaction.reply('❌ Impossible de récupérer mes informations de membre.');
    return;
  }

  try {
    switch (sub) {
  case 'channel':
        await runChannelsAudit(interaction);
        break;
      case 'roles':
        await runRolesAudit(interaction);
        break;
    }
  } catch (err) {
    console.error('Erreur audit:', err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ Une erreur est survenue pendant l\'audit.');
    } else {
      await interaction.reply('❌ Une erreur est survenue pendant l\'audit.');
    }
  }
}

async function runChannelsAudit(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild!;
  const me = guild.members.me!;

  const [logId, bdayId, modId] = await Promise.all([
    getLogChannel(guild.id),
    getBirthdayChannel(guild.id),
    getModerationChannel(guild.id),
  ]);

  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // Helper to check a single channel
  const checkChannel = (id: string | null | undefined, label: string) => {
    if (!id) {
      checks.push({ name: label, ok: false, detail: 'Non configuré' });
      return;
    }
    const ch = guild.channels.cache.get(id);
    if (!ch) {
      checks.push({ name: label, ok: false, detail: `Canal introuvable (${id})` });
      return;
    }
    // Basic type check: must be text-based guild channel
    const isTextGuild =
      ch.type === ChannelType.GuildText ||
      ch.type === ChannelType.GuildAnnouncement ||
      ch.isTextBased();

    if (!isTextGuild) {
      checks.push({ name: label, ok: false, detail: `Type non supporté (${ChannelType[ch.type] ?? ch.type})` });
      return;
    }

    const perms = ch.permissionsFor(me);
    if (!perms) {
      checks.push({ name: label, ok: false, detail: 'Impossible de lire les permissions' });
      return;
    }

    const needed = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ] as const;
    const missing = needed.filter((p) => !perms.has(p));
    if (missing.length > 0) {
      checks.push({ name: label, ok: false, detail: `Permissions manquantes: ${missing.join(', ')}` });
    } else {
      checks.push({ name: label, ok: true, detail: `${ch} prêt` });
    }
  };

  checkChannel(logId, 'Canal de logs');
  checkChannel(bdayId, 'Canal d\'anniversaires');
  checkChannel(modId, 'Canal de modération');

  // Global bot permissions sanity
  const globalNeeded = [
    PermissionFlagsBits.ViewAuditLog,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ReadMessageHistory,
  ] as const;
  const globalMissing = globalNeeded.filter((p) => !me.permissions.has(p));

  const embed = new EmbedBuilder()
    .setAuthor({
      name: interaction.client.user?.username ?? 'Bot',
      iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }),
    })
    .setTitle('🔎 Audit des canaux')
    .setColor(globalMissing.length ? 0xffaa00 : 0x00ff88)
    .setTimestamp()
    .setFooter({
      text: `Demandé par ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL({ forceStatic: false }),
    });

  for (const c of checks) {
    embed.addFields({
      name: `${c.ok ? '✅' : '❌'} ${c.name}`,
      value: c.detail,
      inline: false,
    });
  }

  if (globalMissing.length > 0) {
    embed.addFields({
      name: '⚠️ Permissions globales manquantes',
      value: globalMissing.join(', '),
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function runRolesAudit(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild!;
  const me = guild.members.me!;

  const muteRoleId = await getMuteRole(guild.id);
  const fields: { name: string; value: string; inline?: boolean }[] = [];
  let ok = true;

  if (!muteRoleId) {
    ok = false;
    fields.push({ name: '❌ Rôle de mute', value: 'Non configuré' });
  } else {
    const role = guild.roles.cache.get(muteRoleId);
    if (!role) {
      ok = false;
      fields.push({ name: '❌ Rôle de mute', value: `Introuvable (${muteRoleId})` });
    } else {
      // Position check
      const manageable = me.roles.highest.position > role.position;
      if (!manageable) ok = false;
      fields.push({
        name: `${manageable ? '✅' : '❌'} Rôle de mute`,
        value: `${role} | position: ${role.position} | gérable: ${manageable ? 'oui' : 'non'}`,
      });

      // Channel overwrites sampling — count channels missing denies
      let textTotal = 0,
        textBad = 0,
        voiceTotal = 0,
        voiceBad = 0;
      for (const [, ch] of guild.channels.cache) {
        if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
          textTotal++;
          const ow = ch.permissionOverwrites.cache.get(role.id);
          const denySend = ow?.deny.has(PermissionFlagsBits.SendMessages);
          const denyReact = ow?.deny.has(PermissionFlagsBits.AddReactions);
          const denyThreads = ow?.deny.has(PermissionFlagsBits.SendMessagesInThreads);
          if (!(denySend && denyReact && denyThreads)) textBad++;
        } else if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
          voiceTotal++;
          const ow = ch.permissionOverwrites.cache.get(role.id);
          const denySpeak = ow?.deny.has(PermissionFlagsBits.Speak);
          const denyStream = ow?.deny.has(PermissionFlagsBits.Stream);
          if (!(denySpeak && denyStream)) voiceBad++;
        }
      }

      const textOk = textTotal - textBad;
      const voiceOk = voiceTotal - voiceBad;
      fields.push({
        name: '🔧 Canaux texte configurés',
        value: `${textOk}/${textTotal} avec refus SendMessages + AddReactions + Threads`,
      });
      fields.push({
        name: '🔧 Canaux vocaux configurés',
        value: `${voiceOk}/${voiceTotal} avec refus Speak + Stream`,
      });

      if (textBad + voiceBad > 0) ok = false;
    }
  }

  // @everyone dangerous perms check
  const everyone = guild.roles.everyone;
  const dangerous = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
  ] as const;
  const everyoneDanger = dangerous.filter((p) => everyone.permissions.has(p));
  if (everyoneDanger.length > 0) {
    ok = false;
    fields.push({
      name: '⚠️ Permissions risquées sur @everyone',
      value: everyoneDanger.join(', '),
    });
  } else {
    fields.push({ name: '✅ @everyone', value: 'Aucune permission critique détectée' });
  }

  const embed = new EmbedBuilder()
    .setAuthor({
      name: interaction.client.user?.username ?? 'Bot',
      iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }),
    })
    .setTitle('🔎 Audit des rôles')
    .setColor(ok ? 0x00ff88 : 0xffaa00)
    .setTimestamp()
    .setFooter({
      text: `Demandé par ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL({ forceStatic: false }),
    })
    .addFields(fields);

  await interaction.editReply({ embeds: [embed] });
}
