# Système d'anniversaires Kepler Bot

Le système d'anniversaires permet aux utilisateurs de définir leur date de naissance et au bot d'envoyer automatiquement des messages de félicitations.

## Configuration pour les administrateurs

### 1. Configurer le canal d'anniversaires
```
/bdayconfig canal:#anniversaires
```
Cette commande permet de définir dans quel canal les messages d'anniversaires automatiques seront envoyés.

### 2. Migration de la base de données
Si vous avez déjà une base de données existante, exécutez le fichier `birthday_migration.sql` pour ajouter les tables nécessaires.

## Commandes pour les utilisateurs

### Définir son anniversaire
```
/birthday set jour:15 mois:6 année:1995
```
- `jour` : Jour de naissance (1-31)
- `mois` : Mois de naissance (1-12)
- `année` : Année de naissance (optionnel)

### Voir un anniversaire
```
/birthday get utilisateur:@pseudo
```
Affiche l'anniversaire d'un utilisateur. Si aucun utilisateur n'est spécifié, affiche votre propre anniversaire.

### Supprimer son anniversaire
```
/birthday remove
```
Supprime votre anniversaire de la base de données.

### Voir tous les anniversaires du serveur
```
/birthday list
```
Affiche la liste de tous les anniversaires enregistrés sur le serveur, organisés par mois.

### Célébrer un anniversaire
```
/birthday celebrate utilisateur:@pseudo
```
Envoie un message de félicitations pour l'anniversaire d'un utilisateur. Si un canal d'anniversaires est configuré, le message sera envoyé dans ce canal.

## Fonctionnalités automatiques

- **Vérification quotidienne** : Le bot vérifie automatiquement tous les jours à minuit s'il y a des anniversaires.
- **Messages automatiques** : Si un canal d'anniversaires est configuré, le bot enverra automatiquement un message de félicitations.
- **Calcul de l'âge** : Si l'année de naissance est fournie, le bot calculera et affichera l'âge.

## Structure de la base de données

### Table `birthdays`
- `id` : Identifiant unique
- `guild_id` : ID du serveur Discord
- `user_id` : ID de l'utilisateur Discord
- `birth_day` : Jour de naissance (1-31)
- `birth_month` : Mois de naissance (1-12)
- `birth_year` : Année de naissance (optionnel)
- `created_at` : Date de création
- `updated_at` : Date de dernière modification

### Table `server_configs` (colonne ajoutée)
- `birthday_channel_id` : ID du canal configuré pour les anniversaires

## Sécurité et confidentialité

- Les anniversaires sont stockés par serveur (un utilisateur peut avoir des anniversaires différents sur différents serveurs)
- L'année de naissance est optionnelle pour préserver la confidentialité
- Seuls les administrateurs peuvent configurer le canal d'anniversaires
- Les utilisateurs peuvent supprimer leur anniversaire à tout moment
