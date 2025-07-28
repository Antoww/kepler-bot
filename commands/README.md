# Structure des Commandes

Ce dossier contient toutes les commandes du bot Discord organisées par catégories.

## 📁 Organisation

### 🛠️ Utilitaires (`/utilitaires/`)
Commandes d'information et d'utilité générale :
- `ping.ts` - Affiche la latence du bot
- `userinfo.ts` - Informations sur un utilisateur
- `serverinfo.ts` - Informations sur le serveur
- `channelinfo.ts` - Informations sur un canal
- `roleinfo.ts` - Informations sur un rôle
- `rolelist.ts` - Liste des rôles du serveur
- `whois.ts` - Informations détaillées sur un utilisateur
- `stats.ts` - Statistiques du bot
- `status.ts` - Change le statut du bot
- `genpass.ts` - Génère un mot de passe sécurisé
- `reminder.ts` - Crée un rappel
- `birthday.ts` - Souhaite un joyeux anniversaire
- `credits.ts` - Affiche les crédits du bot
- `minecraft-uuid.ts` - Récupère l'UUID d'un joueur Minecraft
- `wowguilde.ts` - Informations sur une guilde WoW
- `golem.ts` - Crée un golem virtuel

### 🛡️ Modération (`/moderation/`)
Commandes de modération du serveur :
- `clear.ts` - Supprime des messages
- `logconfig.ts` - Configure les logs du serveur

### 🎮 Jeux (`/games/`)
Commandes de divertissement et jeux :
- `coinflip.ts` - Lance une pièce (pile ou face)
- `8ball.ts` - Boule magique pour répondre aux questions
- `meme.ts` - Affiche un meme aléatoire

### ⚙️ Administration (`/administration/`)
Commandes d'administration du bot :
- `config.ts` - Configure les paramètres du bot
- `annonce.ts` - Fait une annonce

## 🔧 Ajout de nouvelles commandes

Pour ajouter une nouvelle commande :

1. **Choisir la catégorie appropriée** dans les sous-dossiers
2. **Créer un fichier TypeScript** avec le nom de la commande
3. **Exporter les propriétés requises** :
   ```typescript
   export const data = new SlashCommandBuilder()
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