import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { config } from 'dotenv';

config();

export const data = new SlashCommandBuilder()
	.setName('gamestats')
	.setDescription('Affiche les statistiques de jeux vidéo')
	.addSubcommand(subcommand =>
		subcommand
			.setName('chess')
			.setDescription('Affiche les stats Chess.com d\'un joueur')
			.addStringOption(option =>
				option
					.setName('username')
					.setDescription('Nom d\'utilisateur Chess.com')
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('lichess')
			.setDescription('Affiche les stats Lichess d\'un joueur')
			.addStringOption(option =>
				option
					.setName('username')
					.setDescription('Nom d\'utilisateur Lichess')
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('minecraft')
			.setDescription('Affiche les infos d\'un joueur Minecraft')
			.addStringOption(option =>
				option
					.setName('username')
					.setDescription('Pseudo Minecraft')
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('dota2')
			.setDescription('Affiche les stats Dota 2 d\'un joueur')
			.addStringOption(option =>
				option
					.setName('joueur')
					.setDescription('ID numérique ou pseudo du joueur Dota 2')
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('osu')
			.setDescription('Affiche les stats Osu! d\'un joueur')
			.addStringOption(option =>
				option
					.setName('username')
					.setDescription('Pseudo Osu!')
					.setRequired(true)
			)
			.addStringOption(option =>
				option
					.setName('mode')
					.setDescription('Mode de jeu')
					.setRequired(false)
					.addChoices(
						{ name: 'osu! (standard)', value: '0' },
						{ name: 'Taiko', value: '1' },
						{ name: 'Catch', value: '2' },
						{ name: 'Mania', value: '3' }
					)
			)
	);

export async function execute(interaction: any) {
	const subcommand = interaction.options.getSubcommand();

	try {
		if (subcommand === 'chess') {
			return await getChessStats(interaction);
		} else if (subcommand === 'lichess') {
			return await getLichessStats(interaction);
		} else if (subcommand === 'minecraft') {
			return await getMinecraftStats(interaction);
		} else if (subcommand === 'dota2') {
			return await getDota2Stats(interaction);
		} else if (subcommand === 'osu') {
			return await getOsuStats(interaction);
		}
	} catch (error) {
		console.error('[STATS] Erreur:', error);
		return interaction.reply({
			content: '❌ Une erreur est survenue lors de la récupération des stats.',
			ephemeral: true
		});
	}
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

		const embed = new EmbedBuilder()
			.setColor('#8b4513')
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

		const embed = new EmbedBuilder()
			.setColor('#3a7c4f')
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

		const embed = new EmbedBuilder()
			.setColor('#7c3aff')
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

		const embed = new EmbedBuilder()
			.setColor('#c65d00')
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

		const embed = new EmbedBuilder()
			.setColor('#00aa00')
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
			console.log(`[STATS] Recherche du joueur Dota 2 par pseudo: ${input}`);
			const searchResponse = await axios.get(
				`https://api.opendota.com/api/search/players?q=${encodeURIComponent(input)}`,
				{ timeout: 5000 }
			);

			if (!searchResponse.data || searchResponse.data.length === 0) {
				return interaction.editReply({
					content: `❌ Joueur \`${input}\` introuvable sur Dota 2`
				});
			}

			// Prendre le premier résultat
			playerId = searchResponse.data[0].account_id.toString();
			console.log(`[STATS] Joueur trouvé avec ID: ${playerId}`);
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

		const embed = new EmbedBuilder()
			.setColor('#b5302b')
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
		if (error.response?.status === 404) {
			return interaction.editReply({
				content: `❌ Joueur \`${input}\` introuvable sur Dota 2`
			});
		}
		throw error;
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

		const embed = new EmbedBuilder()
			.setColor('#ff66aa')
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
