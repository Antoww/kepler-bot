# 📂 Commandes du Bot

Ce dossier contient toutes les commandes slash du bot Discord, organisées par catégories.

## 📁 Structure

```
commands/
├── administration/    # Commandes réservées aux administrateurs
├── games/            # Jeux et divertissement
├── general/          # Commandes générales (ping, help, stats)
├── moderation/       # Outils de modération
└── utilitaires/      # Utilitaires divers
```

---

## ⚙️ Administration (`/administration/`)

Commandes réservées aux administrateurs du serveur ou à l'owner du bot.

| Commande | Description | Permission |
|----------|-------------|------------|
| `/annonce` | Envoyer une annonce dans un canal | Admin |
| `/audit` | Consulter les logs d'audit | Admin |
| `/giveaway` | Créer et gérer des giveaways | Admin |
| `/graph` | Statistiques d'utilisation du bot | Owner |
| `/settings` | Configurer les modules du serveur | Admin |

---

## 🎮 Jeux (`/games/`)

Commandes de divertissement et mini-jeux.

| Commande | Description |
|----------|-------------|
| `/8ball` | Pose une question à la boule magique 🎱 |
| `/blague` | Raconte une blague aléatoire |
| `/chifoumi` | Pierre-feuille-ciseaux |
| `/coinflip` | Pile ou face 🪙 |
| `/count` | Configure le jeu de comptage |
| `/couple` | Crée une image de couple ❤️ |
| `/golem` | Invoque un golem virtuel |
| `/meme` | Affiche un meme aléatoire |
| `/puissance4` | Joue à Puissance 4 contre un autre joueur |

---

## 🏠 Général (`/general/`)

Commandes d'information générale sur le bot.

| Commande | Description |
|----------|-------------|
| `/credits` | Affiche les crédits du bot |
| `/help` | Liste des commandes disponibles |
| `/ping` | Latence du bot et de l'API |
| `/botstats` | Statistiques techniques du bot |

---

## 🛡️ Modération (`/moderation/`)

Outils de modération pour les modérateurs du serveur.

| Commande | Description | Permission |
|----------|-------------|------------|
| `/ban` | Bannir un utilisateur | BanMembers |
| `/unban` | Débannir un utilisateur | BanMembers |
| `/kick` | Expulser un utilisateur | KickMembers |
| `/mute` | Mute un utilisateur (rôle) | ModerateMembers |
| `/unmute` | Unmute un utilisateur | ModerateMembers |
| `/timeout` | Timeout temporaire | ModerateMembers |
| `/untimeout` | Retirer un timeout | ModerateMembers |
| `/warn` | Avertir un utilisateur | ModerateMembers |
| `/clear` | Supprimer des messages | ManageMessages |
| `/sanctions` | Voir l'historique des sanctions | ModerateMembers |

---

## 🔧 Utilitaires (`/utilitaires/`)

Commandes utilitaires diverses.

| Commande | Description |
|----------|-------------|
| `/birthday` | Gérer son anniversaire |
| `/genpass` | Générer un mot de passe sécurisé |
| `/info` | Informations (serveur, utilisateur, canal, rôle) |
| `/lyrics` | Paroles d'une chanson |
| `/mesdonnees` | Gestion RGPD de vos données 🔐 |
| `/minecraft-uuid` | UUID d'un joueur Minecraft |
| `/qrcode` | Générer un QR Code |
| `/reminder` | Créer un rappel |
| `/reminders` | Gérer ses rappels |
| `/rolelist` | Liste des rôles du serveur |

---

## 🔧 Création d'une commande

### Structure de base

```typescript
import { type ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('macommande')
    .setDescription('Description de la commande');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('Hello!');
}
```

### Avec sous-commandes

```typescript
export const data = new SlashCommandBuilder()
    .setName('exemple')
    .setDescription('Commande avec sous-commandes')
    .addSubcommand(sub => sub
        .setName('action1')
        .setDescription('Première action')
    )
    .addSubcommand(sub => sub
        .setName('action2')
        .setDescription('Deuxième action')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
        case 'action1':
            // ...
            break;
        case 'action2':
            // ...
            break;
    }
}
```

### Bonnes pratiques

1. **Utiliser `ChatInputCommandInteraction`** au lieu de `CommandInteraction` pour le typage des options
2. **`deferReply()`** pour les commandes longues (> 3s)
3. **`ephemeral: true`** pour les réponses privées
4. **Gérer les erreurs** avec try/catch
5. **Vérifier les permissions** avec `setDefaultMemberPermissions()`
       .setName('nom-commande')
       .setDescription('Description de la commande');
   
   export async function execute(interaction: CommandInteraction) {
       // Logique de la commande
   }
   ```

## 📋 Structure d'une commande

Chaque commande doit avoir :
- `data` : Définition de la commande slash avec SlashCommandBuilder
- `execute` : Fonction asynchrone qui exécute la commande

## 🚀 Chargement automatique

Le système de chargement parcourt récursivement tous les sous-dossiers et charge automatiquement toutes les commandes trouvées. Aucune configuration supplémentaire n'est nécessaire.
