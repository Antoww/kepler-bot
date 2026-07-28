import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import {
  type CommandInteraction,
  SlashCommandBuilder,
  type SlashCommandSubcommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
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
    await interaction.reply(KEPLER_MESSAGES.guildOnly);
    return;
  }

  const sub = (interaction as unknown as ChatInputCommandInteraction).options.getSubcommand();
  const me = interaction.guild.members.me;

  if (!me) {
    await interaction.reply('❌ Impossible de récupérer mes informations de membre.');
    return;
  }

  // Guard: only Administrators can run
  try {
    const invoker = await interaction.guild.members.fetch(interaction.user.id);
    if (!invoker.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: '❌ Vous devez être administrateur pour utiliser cette commande.', ephemeral: true });
      return;
    }
  } catch {
    await interaction.reply({ content: '❌ Impossible de vérifier vos permissions.', ephemeral: true });
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
      checks.push({ name: label, ok: false, detail: `Permissions manquantes: ${missing.map(p => translatePermission(PermissionFlagsBits[p as unknown as keyof typeof PermissionFlagsBits] as unknown as string)).join(', ')}` });
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

  const embed = createKeplerEmbed()
    .setAuthor({
      name: interaction.client.user?.username ?? 'Bot',
      iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }),
    })
    .setTitle('🔎 Audit des canaux')
    .setColor(globalMissing.length ? KEPLER_COLORS.warning : KEPLER_COLORS.success)
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
      value: globalMissing.map(p => translatePermission(PermissionFlagsBits[p as unknown as keyof typeof PermissionFlagsBits] as unknown as string)).join(', '),
      inline: false,
    });
  }

  // Full sweep across all channels with per-channel status
  type Line = string;
  const textLines: Line[] = [];
  const voiceLines: Line[] = [];
  const otherLines: Line[] = [];
  const riskyEveryoneLines: Line[] = [];

  for (const [, ch] of guild.channels.cache) {
    if (ch.type === ChannelType.GuildCategory) continue;
    const perms = ch.permissionsFor(me);
    // Build required set and collect missing
    const requiredBase: Array<[bigint, string]> = [[PermissionFlagsBits.ViewChannel, 'ViewChannel']];
    let required: Array<[bigint, string]> = requiredBase;
  if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
      required = required.concat([
        [PermissionFlagsBits.ReadMessageHistory, 'ReadMessageHistory'],
        [PermissionFlagsBits.SendMessages, 'SendMessages'],
        [PermissionFlagsBits.EmbedLinks, 'EmbedLinks'],
    [PermissionFlagsBits.AttachFiles, 'AttachFiles'],
    [PermissionFlagsBits.SendTTSMessages, 'SendTTSMessages'],
      ]);
    } else if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
      required = required.concat([
        [PermissionFlagsBits.Connect, 'Connect'],
        [PermissionFlagsBits.Speak, 'Speak'],
        [PermissionFlagsBits.Stream, 'Stream'],
    [PermissionFlagsBits.PrioritySpeaker, 'PrioritySpeaker'],
    [PermissionFlagsBits.MuteMembers, 'MuteMembers'],
    [PermissionFlagsBits.DeafenMembers, 'DeafenMembers'],
    [PermissionFlagsBits.MoveMembers, 'MoveMembers'],
    [PermissionFlagsBits.CreateEvents, 'CreateEvents'],
    [PermissionFlagsBits.ManageEvents, 'ManageEvents'],
      ]);
    } else {
      // Forum or others: only ViewChannel
    }

    const missing: string[] = [];
    for (const [bit, name] of required) {
      if (!perms || !perms.has(bit)) missing.push(translatePermission(name));
    }
  const ok = missing.length === 0;
    const line = `${ok ? '✅' : '❌'} ${formatChan(ch.id, ch.name)}${ok ? '' : ` — ${missing.join(', ')}`}`;

  if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) textLines.push(line);
  else if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) voiceLines.push(line);
  else otherLines.push(line);

  // Check risky @everyone allowances in this channel
    const everyoneId = guild.roles.everyone.id;
    if ('permissionOverwrites' in ch) {
      const ow = ch.permissionOverwrites?.cache.get(everyoneId);
      const risky: string[] = [];
  if (ow?.allow.has(PermissionFlagsBits.MentionEveryone)) risky.push(translatePermission('MentionEveryone'));
  if (ow?.allow.has(PermissionFlagsBits.ManageMessages)) risky.push(translatePermission('ManageMessages'));
  if (ow?.allow.has(PermissionFlagsBits.AddReactions)) risky.push(translatePermission('AddReactions'));
      if (ow?.allow.has(PermissionFlagsBits.ManageChannels)) risky.push(translatePermission('ManageChannels'));
      if (ow?.allow.has(PermissionFlagsBits.ManageWebhooks)) risky.push(translatePermission('ManageWebhooks'));
      if (ow?.allow.has(PermissionFlagsBits.ManageThreads)) risky.push(translatePermission('ManageThreads'));
      if (ow?.allow.has(PermissionFlagsBits.ManageRoles)) risky.push(translatePermission('ManageRoles'));
  if (ow?.allow.has(PermissionFlagsBits.PrioritySpeaker)) risky.push(translatePermission('PrioritySpeaker'));
  if (ow?.allow.has(PermissionFlagsBits.MuteMembers)) risky.push(translatePermission('MuteMembers'));
  if (ow?.allow.has(PermissionFlagsBits.DeafenMembers)) risky.push(translatePermission('DeafenMembers'));
  if (ow?.allow.has(PermissionFlagsBits.MoveMembers)) risky.push(translatePermission('MoveMembers'));
  if (ow?.allow.has(PermissionFlagsBits.CreateEvents)) risky.push(translatePermission('CreateEvents'));
  if (ow?.allow.has(PermissionFlagsBits.ManageEvents)) risky.push(translatePermission('ManageEvents'));
      if (risky.length) riskyEveryoneLines.push(`❗ ${formatChan(ch.id, ch.name)} — @everyone: ${risky.join(', ')}`);
    }
  }

  // Counts & interactive select menu
  const totalText = textLines.length;
  const totalVoice = voiceLines.length;
  const totalRisky = riskyEveryoneLines.length;
  const allLines = [...textLines, ...voiceLines, ...otherLines];
  const misconfiguredLines = allLines.filter(l => l.startsWith('❌'));

  embed.addFields({
    name: '📊 Récapitulatif',
    value: `Texte: ${totalText} | Vocaux: ${totalVoice} | Risqués @everyone: ${totalRisky} | Mal configurés: ${misconfiguredLines.length}`,
    inline: false,
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId('audit_channel_category')
    .setPlaceholder('Sélectionnez une catégorie à afficher')
    .addOptions(
      {
        label: 'Tous les salons',
        value: 'all',
        description: `Lister tous les salons (${allLines.length})`,
        emoji: '📋',
      },
      {
        label: 'Salons textuels',
        value: 'text',
        description: `Textuels (${totalText})`,
        emoji: '📝',
      },
      {
        label: 'Salons vocaux',
        value: 'voice',
        description: `Vocaux (${totalVoice})`,
        emoji: '🔊',
      },
      {
        label: 'Salons mal configurés',
        value: 'bad',
        description: `Permissions manquantes (${misconfiguredLines.length})`,
        emoji: '⚠️',
      },
      {
        label: '@everyone risqué',
        value: 'risky',
        description: `@everyone avec droits sensibles (${totalRisky})`,
        emoji: '🚨',
      },
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const response = await interaction.editReply({ embeds: [embed], components: [row] });

  const addChunkedTo = (target: EmbedBuilder, title: string, lines: string[], capFields = 10, maxLen = 1000) => {
    if (lines.length === 0) {
      target.addFields({ name: title, value: 'Aucun', inline: false });
      return;
    }
    let chunk: string[] = [];
    let size = 0;
    let idx = 0;
    let added = 0;
    for (const l of lines.sort()) {
      if (size + l.length + 1 > maxLen) {
        target.addFields({ name: `${title}${idx ? ` (suite ${idx})` : ''}`, value: chunk.join('\n'), inline: false });
        added++;
        if (added >= capFields) {
          const remaining = lines.length - (idx * (chunk.length || 1)) - chunk.length;
          if (remaining > 0) target.addFields({ name: '…', value: `+ ${remaining} supplémentaires`, inline: false });
          return;
        }
        chunk = [];
        size = 0;
        idx++;
      }
      chunk.push(l);
      size += l.length + 1;
    }
    if (chunk.length && added < capFields) {
      target.addFields({ name: `${title}${idx ? ` (suite ${idx})` : ''}`, value: chunk.join('\n'), inline: false });
    }
  };

  // Types: reply is a Message, we can collect select interactions
  const msg = response as import('discord.js').Message<boolean>;
  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 5 * 60 * 1000 });

  collector.on('collect', async (i: import('discord.js').StringSelectMenuInteraction) => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: 'Vous ne pouvez pas utiliser ce menu.', ephemeral: true });
      return;
    }
    const choice = i.values[0];
    const header = createKeplerEmbed()
      .setAuthor({
        name: interaction.client.user?.username ?? 'Bot',
        iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }),
      })
      .setColor(KEPLER_COLORS.primary)
      .setTimestamp()
      .setFooter({
        text: `Demandé par ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: false }),
      });

    switch (choice) {
      case 'text':
        header.setTitle('📝 Salons textuels');
        addChunkedTo(header, 'Liste', textLines);
        break;
      case 'voice':
        header.setTitle('🔊 Salons vocaux');
        addChunkedTo(header, 'Liste', voiceLines);
        break;
      case 'risky':
        header.setTitle('🚨 @everyone risqué (par canal)');
        addChunkedTo(header, 'Liste', riskyEveryoneLines);
        break;
      case 'bad':
        header.setTitle('⚠️ Salons mal configurés');
        addChunkedTo(header, 'Liste', misconfiguredLines);
        break;
      case 'all':
      default:
        header.setTitle('📋 Tous les salons');
        addChunkedTo(header, 'Salons textuels', textLines);
        addChunkedTo(header, 'Salons vocaux', voiceLines);
        addChunkedTo(header, 'Autres', otherLines);
        break;
    }

    await i.update({ embeds: [header], components: [row] });
  });

  collector.on('end', async () => {
    try { await interaction.editReply({ components: [] }); } catch (_e) { /* message possibly deleted/uncacheable */ }
  });
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
      value: everyoneDanger.map(p => translatePermission(PermissionFlagsBits[p as unknown as keyof typeof PermissionFlagsBits] as unknown as string)).join(', '),
    });
  } else {
    fields.push({ name: '✅ @everyone', value: 'Aucune permission critique détectée' });
  }

  const embed = createKeplerEmbed()
    .setAuthor({
      name: interaction.client.user?.username ?? 'Bot',
      iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }),
    })
    .setTitle('🔎 Audit des rôles')
    .setColor(ok ? KEPLER_COLORS.success : KEPLER_COLORS.warning)
    .setTimestamp()
    .setFooter({
      text: `Demandé par ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL({ forceStatic: false }),
    })
    .addFields(fields);

  // Extra: roles with Administrator and roles the bot cannot manage
  const roles = guild.roles.cache.filter(r => r.id !== guild.roles.everyone.id);
  const adminRoles = Array.from(roles.values()).filter(r => r.permissions.has(PermissionFlagsBits.Administrator));
  const unmanageable = Array.from(roles.values()).filter(r => r.position >= me.roles.highest.position);
  const manageMessagesRoles = Array.from(roles.values()).filter(r => r.permissions.has(PermissionFlagsBits.ManageMessages));
  const mentionEveryoneRoles = Array.from(roles.values()).filter(r => r.permissions.has(PermissionFlagsBits.MentionEveryone));
  const manageChannelsRoles = Array.from(roles.values()).filter(r => r.permissions.has(PermissionFlagsBits.ManageChannels));
  const manageWebhooksRoles = Array.from(roles.values()).filter(r => r.permissions.has(PermissionFlagsBits.ManageWebhooks));
  const manageThreadsRoles = Array.from(roles.values()).filter(r => r.permissions.has(PermissionFlagsBits.ManageThreads));
  const manageRolesRoles = Array.from(roles.values()).filter(r => r.permissions.has(PermissionFlagsBits.ManageRoles));

  const listByPosition = (arr: typeof adminRoles) => arr
    .sort((a,b) => b.position - a.position)
    .slice(0, 10)
    .map(r => `${r.name} (${r.id})`)
    .join('\n') || 'Aucun';

  embed.addFields(
  { name: `🛡️ Rôles avec Administrator (${adminRoles.length})`, value: listByPosition(adminRoles), inline: false },
  { name: `⚙️ Rôles non gérables par le bot (${unmanageable.length})`, value: listByPosition(unmanageable), inline: false },
  { name: `🧹 Rôles pouvant gérer/supprimer des messages (${manageMessagesRoles.length})`, value: listByPosition(manageMessagesRoles), inline: false },
  { name: `📣 Rôles pouvant mentionner @everyone/@here (${mentionEveryoneRoles.length})`, value: listByPosition(mentionEveryoneRoles), inline: false },
  { name: `📁 Rôles pouvant gérer des salons (${manageChannelsRoles.length})`, value: listByPosition(manageChannelsRoles), inline: false },
  { name: `🧵 Rôles pouvant gérer des fils (${manageThreadsRoles.length})`, value: listByPosition(manageThreadsRoles), inline: false },
  { name: `🔗 Rôles pouvant gérer les webhooks (${manageWebhooksRoles.length})`, value: listByPosition(manageWebhooksRoles), inline: false },
  { name: `🎭 Rôles pouvant gérer d'autres rôles (${manageRolesRoles.length})`, value: listByPosition(manageRolesRoles), inline: false },
  );

  await interaction.editReply({ embeds: [embed] });
}

function formatChan(id: string, name?: string | null) {
  return `<#${id}>${name ? ` (${name})` : ''}`;
}

/**
 * Traduit les noms de permissions Discord en français
 */
function translatePermission(permission: string): string {
  const translations: Record<string, string> = {
    // Permissions critiques/à risques
    'Administrator': 'Administrateur',
    'ManageGuild': 'Gérer le serveur',
    'ManageRoles': 'Gérer les rôles',
    'ManageChannels': 'Gérer les salons',
    'ManageMessages': 'Gérer les messages',
    'ManageWebhooks': 'Gérer les webhooks',
    'ManageThreads': 'Gérer les fils',
    'MentionEveryone': 'Mentionner @everyone',
    'MuteMembers': 'Rendre muet des membres',
    'DeafenMembers': 'Mettre en sourdine des membres',
    'MoveMembers': 'Déplacer des membres',
    'ManageEvents': 'Gérer les événements',
    'CreateEvents': 'Créer des événements',

    // Permissions de base
    'ViewChannel': 'Voir le salon',
    'SendMessages': 'Envoyer des messages',
    'SendMessagesInThreads': 'Envoyer des messages dans les fils',
    'EmbedLinks': 'Intégrer des liens',
    'AttachFiles': 'Joindre des fichiers',
    'AddReactions': 'Ajouter des réactions',
    'ReadMessageHistory': 'Lire l\'historique des messages',
    'SendTTSMessages': 'Envoyer des messages TTS',
    'ViewAuditLog': 'Voir les logs d\'audit',

    // Permissions vocales
    'Connect': 'Se connecter',
    'Speak': 'Parler',
    'Stream': 'Streamer',
    'PrioritySpeaker': 'Priorité de parole',
  };

  return translations[permission] || permission;
}
