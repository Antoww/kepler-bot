import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle, type User } from 'discord.js';
import axios from 'axios';
import { config } from 'dotenv';
import { logger } from '../../utils/logger.ts';

config();

type GameKey = 'chess' | 'lichess' | 'minecraft' | 'dota2' | 'osu';
const PANEL_TIMEOUT = 5 * 60 * 1000;
const GAME_LABELS: Record<GameKey, string> = { chess: 'Chess.com', lichess: 'Lichess', minecraft: 'Minecraft', dota2: 'Dota 2', osu: 'osu!' };

export const data = new SlashCommandBuilder().setName('gamestats').setDescription('Ouvre le panneau de statistiques de jeux');

export async function execute(interaction: ChatInputCommandInteraction) {
	const response = await interaction.reply({ ...buildHome(interaction.user), ephemeral: true, fetchReply: true });
	const collector = response.createMessageComponentCollector({ time: PANEL_TIMEOUT });
	collector.on('collect', async component => {
		if (component.user.id !== interaction.user.id) {
			await component.reply({ content: KEPLER_MESSAGES.unauthorizedComponent, ephemeral: true });
			return;
		}
		if (component.customId === 'gamestats:home') {
			await component.update(buildHome(interaction.user));
			return;
		}
		if (component.customId === 'gamestats:close') {
			await component.update({ content: 'Panneau des statistiques fermé.', embeds: [], components: [] });
			return;
		}
		if (!component.isButton() || !component.customId.startsWith('gamestats:game:')) return;
		const game = component.customId.split(':')[2] as GameKey;
		try {
			await component.showModal(buildLookupModal(game));
			const modal = await component.awaitModalSubmit({
				filter: submission => submission.user.id === interaction.user.id && submission.customId === `gamestats:lookup:${game}`,
				time: 2 * 60 * 1000
			});
			await modal.deferUpdate();
			const query = modal.fields.getTextInputValue('player').trim();
			const mode = game === 'osu' ? normalizeOsuMode(modal.fields.getTextInputValue('mode')) : undefined;
			await modal.editReply({
				content: '',
				embeds: [createKeplerEmbed('neutral')
					.setTitle(`Recherche ${GAME_LABELS[game]}`)
					.setDescription(`⏳ Récupération des statistiques de **${query}**…`)],
				components: []
			});
			await runLookup(game, query, mode, interaction.user, payload => modal.editReply(resultPayload(payload)));
		} catch (error: any) {
			if (error?.code === 'InteractionCollectorError') return;
			logger.error(`Erreur gamestats ${game}`, error, 'GameStatsPanel');
			await interaction.editReply(resultPayload({ content: KEPLER_MESSAGES.unexpectedError }));
		}
	});
	collector.on('end', async () => {
		try { await interaction.editReply({ components: [] }); } catch { /* Le panneau peut déjà être fermé. */ }
	});
}

function buildHome(user: User) {
	const embed = createKeplerEmbed('accent').setTitle('🎮 Statistiques de jeux')
		.setDescription('Choisissez un jeu, puis saisissez le nom du joueur à rechercher.')
		.addFields({ name: '♟️ Échecs', value: 'Chess.com et Lichess', inline: true }, { name: '🕹️ Jeux', value: 'Minecraft, Dota 2 et osu!', inline: true })
		.setFooter({ text: `Panneau privé • ${user.username} • expiration dans 5 minutes` });
	const games = new ActionRowBuilder<ButtonBuilder>().addComponents(
		gameButton('chess', '♟️'), gameButton('lichess', '♞'), gameButton('minecraft', '⛏️'), gameButton('dota2', '🛡️'), gameButton('osu', '🎵')
	);
	const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId('gamestats:home').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId('gamestats:close').setEmoji('✖️').setStyle(ButtonStyle.Secondary)
	);
	return { content: '', embeds: [embed], components: [games, controls] };
}

function gameButton(game: GameKey, emoji: string): ButtonBuilder {
	return new ButtonBuilder().setCustomId(`gamestats:game:${game}`).setLabel(GAME_LABELS[game]).setEmoji(emoji).setStyle(ButtonStyle.Secondary);
}

function buildLookupModal(game: GameKey): ModalBuilder {
	const player = new TextInputBuilder().setCustomId('player').setStyle(TextInputStyle.Short)
		.setLabel(game === 'dota2' ? 'Pseudo ou ID numérique' : 'Nom du joueur')
		.setPlaceholder(`Joueur ${GAME_LABELS[game]}`).setRequired(true).setMaxLength(100);
	const modal = new ModalBuilder().setCustomId(`gamestats:lookup:${game}`).setTitle(`Recherche ${GAME_LABELS[game]}`)
		.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(player));
	if (game === 'osu') {
		const mode = new TextInputBuilder().setCustomId('mode').setStyle(TextInputStyle.Short).setLabel('Mode de jeu')
			.setPlaceholder('standard, taiko, catch ou mania').setRequired(false).setMaxLength(10);
		modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(mode));
	}
	return modal;
}

async function runLookup(game: GameKey, query: string, mode: string | undefined, user: User, editReply: (payload: any) => Promise<unknown>) {
	const adapter = { user, options: { getString: (name: string) => name === 'mode' ? mode : query }, deferReply: async () => undefined, editReply };
	if (game === 'chess') return getChessStats(adapter);
	if (game === 'lichess') return getLichessStats(adapter);
	if (game === 'minecraft') return getMinecraftStats(adapter);
	if (game === 'dota2') return getDota2Stats(adapter);
	return getOsuStats(adapter);
}

function resultPayload(payload: any) {
	return { content: payload.content ?? '', embeds: payload.embeds ?? [], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId('gamestats:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
	)] };
}

function normalizeOsuMode(input: string): string {
	return ({ '': '0', '0': '0', standard: '0', osu: '0', '1': '1', taiko: '1', '2': '2', catch: '2', '3': '3', mania: '3' } as Record<string, string>)[input.trim().toLowerCase()] ?? '0';
}

async function getChessStats(interaction: any) {
	const username = interaction.options.getString('username').toLowerCase();

	await interaction.deferReply();

	try {
		console.log(`[STATS] Récupération Chess.com stats pour ${username}...`);

		const response = await axios.get(`https://api.chess.com/pub/player/${username}`, {
			timeout: 5000
		});

		const player = response.data;
		const statsResponse = await axios.get(
			`https://api.chess.com/pub/player/${username}/stats`,
			{ timeout: 5000 }
		);

		const stats = statsResponse.data;

		const embed = createKeplerEmbed()
			.setColor(KEPLER_COLORS.neutral)
			.setTitle(`♟️ Stats Chess.com - ${player.username}`)
			.setThumbnail(player.avatar || null)
			.addFields(
				{ name: 'Nom', value: player.name || 'N/A', inline: true },
				{ name: 'Titre', value: player.title || 'Aucun', inline: true },
				{
					name: 'Elo Blitz',
					value: (stats.chess_blitz?.last?.rating || 'N/A').toString(),
					inline: true
				},
				{
					name: 'Elo Rapide',
					value: (stats.chess_rapid?.last?.rating || 'N/A').toString(),
					inline: true
				},
				{
					name: 'Elo Bullet',
					value: (stats.chess_bullet?.last?.rating || 'N/A').toString(),
					inline: true
				},
				{
					name: 'Elo Classique',
					value: (stats.chess_classical?.last?.rating || 'N/A').toString(),
					inline: true
				},
				{ name: 'Pays', value: player.country_name || 'N/A', inline: true },
				{
					name: 'Membre depuis',
					value: new Date(player.joined * 1000).toLocaleDateString('fr-FR'),
					inline: true
				}
			)
			.setFooter({
				text: `Demandé par ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setTimestamp();

		console.log(`[STATS] ✅ Chess.com stats récupérées`);
		return interaction.editReply({ embeds: [embed] });
	} catch (error: any) {
		if (error.response?.status === 404) {
			return interaction.editReply({
				content: `❌ Joueur \`${username}\` introuvable sur Chess.com`
			});
		}
		throw error;
	}
}

async function getLichessStats(interaction: any) {
	const username = interaction.options.getString('username');

	await interaction.deferReply();

	try {
		console.log(`[STATS] Récupération Lichess stats pour ${username}...`);

		const response = await axios.get(`https://lichess.org/api/user/${username}`, {
			timeout: 5000,
			headers: { 'Accept': 'application/json' }
		});

		const player = response.data;

		const embed = createKeplerEmbed()
			.setColor(KEPLER_COLORS.success)
			.setTitle(`♟️ Stats Lichess - ${player.username}`)
			.setThumbnail(player.title ? `https://lichess.org/assets/${player.title}.png` : null)
			.addFields(
				{ name: 'Nom', value: player.profile?.fullName || 'N/A', inline: true },
				{ name: 'Titre', value: player.title || 'Aucun', inline: true },
				{ name: 'Elo Blitz', value: player.perfs?.blitz?.rating || 'N/A', inline: true },
				{ name: 'Elo Rapide', value: player.perfs?.rapid?.rating || 'N/A', inline: true },
				{
					name: 'Elo Classique',
					value: player.perfs?.classical?.rating || 'N/A',
					inline: true
				},
				{ name: 'Elo Bullet', value: player.perfs?.bullet?.rating || 'N/A', inline: true },
				{
					name: 'Parties jouées',
					value: (player.counts?.all || 0).toString(),
					inline: true
				},
				{
					name: 'Taux de victoire',
					value: player.perfs?.blitz?.games
						? `${((player.perfs.blitz.games / (player.counts?.all || 1)) * 100).toFixed(1)}%`
						: 'N/A',
					inline: true
				}
			)
			.setFooter({
				text: `Demandé par ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setTimestamp();

		console.log(`[STATS] ✅ Lichess stats récupérées`);
		return interaction.editReply({ embeds: [embed] });
	} catch (error: any) {
		if (error.response?.status === 404) {
			return interaction.editReply({
				content: `❌ Joueur \`${username}\` introuvable sur Lichess`
			});
		}
		throw error;
	}
}

async function getFortniteStats(interaction: any) {
	const username = interaction.options.getString('username');
	const platform = interaction.options.getString('plateforme') || 'pc';
	const apiKey = process.env.FORTNITE_API_KEY;

	await interaction.deferReply();

	if (!apiKey) {
		return interaction.editReply({
			content: '❌ L\'API Fortnite n\'est pas configurée.'
		});
	}

	try {
		console.log(`[STATS] Récupération Fortnite stats pour ${username}...`);

		const response = await axios.get(
			`https://fortnite-api.com/v2/stats/br/v2?name=${username}&accountType=${platform}`,
			{
				timeout: 5000,
				headers: { Authorization: apiKey }
			}
		);

		if (!response.data.result) {
			return interaction.editReply({
				content: `❌ Joueur \`${username}\` introuvable sur Fortnite (plateforme: ${platform})`
			});
		}

		const stats = response.data.result;

		const embed = createKeplerEmbed()
			.setColor(KEPLER_COLORS.accent)
			.setTitle(`🎮 Stats Fortnite - ${username}`)
			.setThumbnail(stats.battlePass?.level ? 'https://fortnite-api.com/images/cosmetics/br/v1/avatar.png' : null)
			.addFields(
				{ name: 'Niveau', value: (stats.battlePass?.level || 0).toString(), inline: true },
				{ name: 'Plateforme', value: platform.toUpperCase(), inline: true },
				{
					name: 'Victoires',
					value: stats.all?.overall?.wins?.toString() || '0',
					inline: true
				},
				{
					name: 'KDA',
					value: stats.all?.overall?.kd?.toFixed(2) || 'N/A',
					inline: true
				},
				{
					name: 'Parties jouées',
					value: stats.all?.overall?.matches?.toString() || '0',
					inline: true
				},
				{
					name: 'Taux de victoire',
					value: `${((stats.all?.overall?.winRate || 0) * 100).toFixed(1)}%`,
					inline: true
				}
			)
			.setFooter({
				text: `Demandé par ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setTimestamp();

		console.log(`[STATS] ✅ Fortnite stats récupérées`);
		return interaction.editReply({ embeds: [embed] });
	} catch (error: any) {
		if (error.response?.status === 404) {
			return interaction.editReply({
				content: `❌ Joueur \`${username}\` introuvable sur Fortnite`
			});
		}
		throw error;
	}
}

async function getCoCStats(interaction: any) {
	const tag = interaction.options.getString('tag').replace('#', '');
	const apiKey = process.env.COC_API_KEY;

	await interaction.deferReply();

	if (!apiKey) {
		return interaction.editReply({
			content: '❌ L\'API Clash of Clans n\'est pas configurée.'
		});
	}

	try {
		console.log(`[STATS] Récupération CoC stats pour #${tag}...`);

		const response = await axios.get(`https://api.clashofclans.com/v1/clans/%23${tag}`, {
			timeout: 5000,
			headers: { Authorization: `Bearer ${apiKey}` }
		});

		const clan = response.data;

		const embed = createKeplerEmbed()
			.setColor(KEPLER_COLORS.warning)
			.setTitle(`🛡️ Stats Clash of Clans - ${clan.name}`)
			.setThumbnail(clan.badgeUrls?.large || null)
			.addFields(
				{ name: 'Tag', value: `#${clan.tag}`, inline: true },
				{ name: 'Niveau', value: clan.clanLevel?.toString() || 'N/A', inline: true },
				{ name: 'Trophées', value: clan.clanPoints?.toString() || '0', inline: true },
				{ name: 'Membres', value: `${clan.members}/50`, inline: true },
				{
					name: 'Guerre',
					value: clan.isWarLogPublic ? `${clan.warWins} victoires` : 'Log privé',
					inline: true
				},
				{ name: 'Type', value: clan.type?.charAt(0).toUpperCase() + clan.type?.slice(1) || 'N/A', inline: true }
			)
			.setFooter({
				text: `Demandé par ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setTimestamp();

		console.log(`[STATS] ✅ CoC stats récupérées`);
		return interaction.editReply({ embeds: [embed] });
	} catch (error: any) {
		if (error.response?.status === 404) {
			return interaction.editReply({
				content: `❌ Clan \`#${tag}\` introuvable sur Clash of Clans`
			});
		}
		throw error;
	}
}

async function getMinecraftStats(interaction: any) {
	const username = interaction.options.getString('username');

	await interaction.deferReply();

	try {
		console.log(`[STATS] Récupération Minecraft stats pour ${username}...`);

		// Récupérer l'UUID du joueur
		const uuidResponse = await axios.get(
			`https://api.mojang.com/users/profiles/minecraft/${username}`,
			{ timeout: 5000 }
		);

		const uuid = uuidResponse.data.id;

		// Récupérer le profil complet
		const profileResponse = await axios.get(
			`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`,
			{ timeout: 5000 }
		);

		const profile = profileResponse.data;
		const skinUrl = `https://visage.surgeplay.com/face/256/${uuid}`;

		const embed = createKeplerEmbed()
			.setColor(KEPLER_COLORS.success)
			.setTitle(`⛏️ Profil Minecraft - ${profile.name}`)
			.setThumbnail(skinUrl)
			.addFields(
				{ name: 'UUID', value: `\`${uuid}\``, inline: true },
				{ name: 'Pseudo', value: profile.name, inline: true },
				{
					name: 'Historique des noms',
					value: profile.properties?.[0]?.value ? 'Disponible' : 'N/A',
					inline: true
				}
			)
			.setFooter({
				text: `Demandé par ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setTimestamp();

		console.log(`[STATS] ✅ Minecraft stats récupérées`);
		return interaction.editReply({ embeds: [embed] });
	} catch (error: any) {
		if (error.response?.status === 404) {
			return interaction.editReply({
				content: `❌ Joueur \`${username}\` introuvable sur Minecraft`
			});
		}
		throw error;
	}
}

async function getDota2Stats(interaction: any) {
	const input = interaction.options.getString('joueur');

	await interaction.deferReply();

	try {
		console.log(`[STATS] Récupération Dota 2 stats pour ${input}...`);

		let playerId = input;

		// Si ce n'est pas un ID numérique, chercher via le pseudo
		if (!/^\d+$/.test(input)) {
			try {
				console.log(`[STATS] Recherche du joueur Dota 2 par pseudo: ${input}`);
				const searchResponse = await axios.get(
					`https://api.opendota.com/api/search/players?q=${encodeURIComponent(input)}&limit=1`,
					{ timeout: 5000 }
				);

				if (!searchResponse.data || searchResponse.data.length === 0) {
					return interaction.editReply({
						content: `❌ Joueur \`${input}\` introuvable sur Dota 2.\n💡 Essayez avec l'ID numérique du joueur ou vérifiez l'orthographe du pseudo.`
					});
				}

				// Prendre le premier résultat
				playerId = searchResponse.data[0].account_id?.toString();
				if (!playerId) {
					return interaction.editReply({
						content: `❌ Impossible de convertir le pseudo \`${input}\` en ID.`
					});
				}
				console.log(`[STATS] Joueur trouvé avec ID: ${playerId}`);
			} catch (searchError: any) {
				console.error(`[STATS] Erreur lors de la recherche:`, searchError.message);
				return interaction.editReply({
					content: `❌ Erreur lors de la recherche du joueur \`${input}\`.\n💡 Essayez avec l'ID numérique du joueur.`
				});
			}
		}

		const response = await axios.get(`https://api.opendota.com/api/players/${playerId}`, {
			timeout: 5000
		});

		if (!response.data || response.data.error) {
			return interaction.editReply({
				content: `❌ Impossible de récupérer les stats du joueur \`${input}\``
			});
		}

		const player = response.data;

		// Récupérer les stats détaillées
		const wlResponse = await axios.get(
			`https://api.opendota.com/api/players/${playerId}/wl`,
			{ timeout: 5000 }
		);

		const winLoss = wlResponse.data;
		const totalGames = (winLoss.win || 0) + (winLoss.lose || 0);
		const winRate = totalGames > 0 ? ((winLoss.win / totalGames) * 100).toFixed(1) : '0';

		const embed = createKeplerEmbed()
			.setColor(KEPLER_COLORS.danger)
			.setTitle(`🎮 Stats Dota 2 - ${player.personaname || 'Anonyme'}`)
			.setThumbnail(player.avatarfull || null)
			.addFields(
				{ name: 'Rang MMR', value: (player.rank_tier || 'N/A').toString(), inline: true },
				{ name: 'Victoires', value: (winLoss.win || 0).toString(), inline: true },
				{ name: 'Défaites', value: (winLoss.lose || 0).toString(), inline: true },
				{ name: 'Total de parties', value: totalGames.toString(), inline: true },
				{ name: 'Taux de victoire', value: `${winRate}%`, inline: true },
				{
					name: 'Pays',
					value: player.loccountrycode || 'N/A',
					inline: true
				}
			)
			.setFooter({
				text: `Demandé par ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setTimestamp();

		console.log(`[STATS] ✅ Dota 2 stats récupérées`);
		return interaction.editReply({ embeds: [embed] });
	} catch (error: any) {
		console.error(`[STATS] Erreur Dota 2:`, error.message);

		if (error.response?.status === 404) {
			return interaction.editReply({
				content: `❌ Joueur \`${input}\` introuvable sur Dota 2`
			});
		}

		return interaction.editReply({
			content: `❌ Erreur lors de la récupération des stats Dota 2`
		});
	}
}

async function getOsuStats(interaction: any) {
	const username = interaction.options.getString('username');
	const mode = interaction.options.getString('mode') || '0';
	const modeNames: { [key: string]: string } = {
		'0': 'osu!',
		'1': 'Taiko',
		'2': 'Catch',
		'3': 'Mania'
	};

	await interaction.deferReply();

	try {
		console.log(`[STATS] Récupération Osu! stats pour ${username} (mode ${mode})...`);

		// Osu! API v2 nécessite une clé, on utilise une alternative gratuite
		const response = await axios.get(
			`https://osu.ppy.sh/api/v2/users/${username}/${mode}`,
			{
				timeout: 5000,
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'Discord Bot'
				}
			}
		);

		const user = response.data;

		const embed = createKeplerEmbed()
			.setColor(KEPLER_COLORS.highlight)
			.setTitle(`🎵 Stats Osu! - ${user.username} (${modeNames[mode]})`)
			.setThumbnail(user.avatar_url || null)
			.addFields(
				{ name: 'Rang Global', value: (user.statistics?.global_rank || 'N/A').toString(), inline: true },
				{ name: 'PP', value: (user.statistics?.pp || 0).toFixed(0), inline: true },
				{ name: 'Accuracy', value: `${(user.statistics?.hit_accuracy || 0).toFixed(2)}%`, inline: true },
				{
					name: 'Parties jouées',
					value: (user.statistics?.play_count || 0).toString(),
					inline: true
				},
				{ name: 'Niveau', value: (user.statistics?.level?.current || 0).toString(), inline: true },
				{
					name: 'Total de hits',
					value: (user.statistics?.total_hits || 0).toString(),
					inline: true
				}
			)
			.setFooter({
				text: `Demandé par ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setTimestamp();

		console.log(`[STATS] ✅ Osu! stats récupérées`);
		return interaction.editReply({ embeds: [embed] });
	} catch (error: any) {
		if (error.response?.status === 404) {
			return interaction.editReply({
				content: `❌ Joueur \`${username}\` introuvable sur Osu!`
			});
		}
		console.error('Erreur Osu!:', error.message);
		throw error;
	}
}
