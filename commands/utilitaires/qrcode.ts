import { createKeplerEmbed, KEPLER_COLORS } from '../../utils/theme.ts';
import { SlashCommandBuilder } from 'discord.js';
import QRCode from 'qrcode';
import { Buffer } from 'node:buffer';

export const data = new SlashCommandBuilder()
	.setName('qrcode')
	.setDescription('Génère un code QR')
	.addSubcommand(subcommand =>
		subcommand
			.setName('lien')
			.setDescription('Génère un QR code à partir d\'un lien')
			.addStringOption(option =>
				option
					.setName('url')
					.setDescription('L\'adresse web à encoder')
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('texte')
			.setDescription('Génère un QR code à partir d\'un texte')
			.addStringOption(option =>
				option
					.setName('contenu')
					.setDescription('Le texte à encoder')
					.setRequired(true)
					.setMaxLength(500)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('wifi')
			.setDescription('Génère un QR code pour se connecter à un WiFi')
			.addStringOption(option =>
				option
					.setName('ssid')
					.setDescription('Le nom du réseau WiFi')
					.setRequired(true)
					.setMaxLength(32)
			)
			.addStringOption(option =>
				option
					.setName('password')
					.setDescription('Le mot de passe du WiFi')
					.setRequired(true)
					.setMaxLength(63)
			)
			.addStringOption(option =>
				option
					.setName('securite')
					.setDescription('Type de sécurité du WiFi')
					.setRequired(false)
					.addChoices(
						{ name: 'WPA', value: 'WPA' },
						{ name: 'WEP', value: 'WEP' },
						{ name: 'Aucune', value: 'nopass' }
					)
			)
	);

export async function execute(interaction: any) {
	const subcommand = interaction.options.getSubcommand();
	let qrData: string;
	let title: string;
	let description: string;

	try {
		if (subcommand === 'lien') {
			const url = interaction.options.getString('url');
			// Valider que c'est une URL valide
			try {
				new URL(url);
			} catch {
				return interaction.reply({
					content: '❌ L\'URL fournie n\'est pas valide.',
					ephemeral: true
				});
			}
			qrData = url;
			title = '🔗 QR Code - Lien';
			description = `\`${url}\``;
		} else if (subcommand === 'texte') {
			const texte = interaction.options.getString('contenu');
			qrData = texte;
			title = '📝 QR Code - Texte';
			description = `Texte: \`${texte}\``;
		} else if (subcommand === 'wifi') {
			const ssid = interaction.options.getString('ssid');
			const password = interaction.options.getString('password');
			const securite = interaction.options.getString('securite') || 'WPA';

			// Format WiFi QR code: WIFI:T:securite;S:ssid;P:password;;
			// Échapper les caractères spéciaux
			const escapedSsid = escapeWifiString(ssid);
			const escapedPassword = escapeWifiString(password);
			qrData = `WIFI:T:${securite};S:${escapedSsid};P:${escapedPassword};;`;
			title = '📶 QR Code - WiFi';
			description = `Réseau: \`${ssid}\`\nSécurité: \`${securite}\``;
		}

		// Générer le QR code
		console.log(`[QRCODE] Génération pour ${subcommand}...`);
		const buffer = await QRCode.toBuffer(qrData, {
			errorCorrectionLevel: 'H',
			type: 'image/png',
			quality: 0.95,
			margin: 2,
			width: 400,
			color: {
				dark: '#000000',
				light: '#FFFFFF'
			}
		});

		console.log(`[QRCODE] ✅ Généré (${buffer.length} bytes)`);

		// Créer l'embed
		const embed = createKeplerEmbed()
			.setColor(KEPLER_COLORS.success)
			.setTitle(title)
			.setDescription(description)
			.setImage('attachment://qrcode.png')
			.setFooter({
				text: `Demandé par ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({ dynamic: true })
			})
			.setTimestamp();

		return interaction.reply({
			embeds: [embed],
			files: [
				{
					attachment: buffer,
					name: 'qrcode.png'
				}
			]
		});
	} catch (error) {
		console.error('[QRCODE] Erreur:', error);
		return interaction.reply({
			content: '❌ Une erreur est survenue lors de la génération du QR code.',
			ephemeral: true
		});
	}
}

/**
 * Échappe les caractères spéciaux pour le format WiFi QR
 */
function escapeWifiString(str: string): string {
	return str
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/:/g, '\\:')
		.replace(/,/g, '\\,')
		.replace(/"/g, '\\"');
}
