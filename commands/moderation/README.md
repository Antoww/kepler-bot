# Commandes de Modération

Ce dossier contient toutes les commandes liées à la modération du serveur Discord.

## Configuration

### `moderationconfig`
Configure le canal où seront envoyés les logs de modération.

**Utilisation :** `/moderationconfig canal:#logs-moderation`

**Permissions requises :** Administrateur

## Commandes de Sanction

### `ban`
Bannit un utilisateur du serveur avec possibilité de ban temporaire.

**Utilisation :** `/ban utilisateur:@user [raison:"Spam"] [duree:"1d"] [suppression_messages:7]`

**Options :**
- `utilisateur` : L'utilisateur à bannir (requis)
- `raison` : La raison du bannissement (optionnel)
- `duree` : Durée du ban (ex: 1d, 2h, 30m, 1w) - laissez vide pour un ban permanent (optionnel)
- `suppression_messages` : Nombre de jours de messages à supprimer (0-7) (optionnel)

**Permissions requises :** Bannir des membres

### `kick`
Expulse un utilisateur du serveur.

**Utilisation :** `/kick utilisateur:@user [raison:"Comportement inapproprié"]`

**Options :**
- `utilisateur` : L'utilisateur à expulser (requis)
- `raison` : La raison de l'expulsion (optionnel)

**Permissions requises :** Expulser des membres

### `mute`
Rend muet un utilisateur pour une durée déterminée.

**Utilisation :** `/mute utilisateur:@user duree:"1h" [raison:"Spam"]`

**Options :**
- `utilisateur` : L'utilisateur à rendre muet (requis)
- `duree` : Durée du mute (ex: 1d, 2h, 30m) (requis)
- `raison` : La raison du mute (optionnel)

**Permissions requises :** Exclure temporairement des membres

### `unban`
Débannit un utilisateur du serveur.

**Utilisation :** `/unban user_id:"123456789012345678" [raison:"Appel accepté"]`

**Options :**
- `user_id` : L'ID de l'utilisateur à débannir (requis)
- `raison` : La raison du débannissement (optionnel)

**Permissions requises :** Bannir des membres

### `unmute`
Annule le mute d'un utilisateur.

**Utilisation :** `/unmute utilisateur:@user [raison:"Comportement amélioré"]`

**Options :**
- `utilisateur` : L'utilisateur à démuter (requis)
- `raison` : La raison de l'annulation du mute (optionnel)

**Permissions requises :** Exclure temporairement des membres

## Commandes d'Information

### `warn`
Avertir un utilisateur.

**Utilisation :** `/warn utilisateur:@user raison:"Spam"`

**Options :**
- `utilisateur` : L'utilisateur à avertir (requis)
- `raison` : La raison de l'avertissement (requis)

**Permissions requises :** Exclure temporairement des membres

### `sanctions`
Gère les sanctions d'un utilisateur (voir toutes les sanctions ou en supprimer).

#### Sous-commande `voir`
Affiche toutes les sanctions d'un utilisateur avec pagination.

**Utilisation :** `/sanctions voir utilisateur:@user`

**Options :**
- `utilisateur` : L'utilisateur dont afficher les sanctions (requis)

#### Sous-commande `supprimer`
Supprime une sanction par son numéro.

**Utilisation :** `/sanctions supprimer numero_sanction:123 [raison:"Erreur"]`

**Options :**
- `numero_sanction` : Le numéro de la sanction à supprimer (requis)
- `raison` : La raison de la suppression (optionnel)

**Permissions requises :** Exclure temporairement des membres

### `warnings`
Affiche tous les avertissements d'un utilisateur.

**Utilisation :** `/warnings utilisateur:@user`

**Options :**
- `utilisateur` : L'utilisateur dont afficher les avertissements (requis)

**Permissions requises :** Exclure temporairement des membres

### `modinfo`
Affiche les informations de modération d'un utilisateur (historique et sanctions actives) avec pagination.

**Utilisation :** `/modinfo utilisateur:@user`

**Options :**
- `utilisateur` : L'utilisateur dont afficher les informations (requis)

**Fonctionnalités :**
- Affichage des sanctions actives (bans/mutes temporaires)
- Historique paginé (5 sanctions par page)
- Statistiques complètes
- Navigation avec boutons

**Permissions requises :** Exclure temporairement des membres

## Formats de Durée

Les durées acceptées utilisent les suffixes suivants :
- `s` : secondes
- `m` : minutes  
- `h` : heures
- `d` : jours
- `w` : semaines

**Exemples :**
- `30s` : 30 secondes
- `15m` : 15 minutes
- `2h` : 2 heures
- `7d` : 7 jours
- `1w` : 1 semaine

## Fonctionnalités Automatiques

- **Débans automatiques** : Les bans temporaires sont automatiquement levés à l'expiration
- **Démutes automatiques** : Les mutes temporaires sont automatiquement annulés à l'expiration
- **Historique** : Toutes les actions de modération sont enregistrées dans l'historique
- **Logs** : Toutes les actions sont envoyées dans le canal de modération configuré

## Sécurité

- Les modérateurs ne peuvent pas sanctionner des utilisateurs ayant un rôle égal ou supérieur
- Impossible de se sanctionner soi-même
- Le bot ne peut pas être sanctionné
- Vérification des permissions avant chaque action

## Système de Numérotation

Chaque sanction (ban, kick, mute, warn) reçoit un **numéro unique** par serveur :
- Les numéros commencent à 1 pour chaque serveur
- Ils sont incrémentés automatiquement pour chaque nouvelle sanction
- Permet de référencer facilement une sanction spécifique
- Affiché dans tous les embeds et logs de modération

**Exemple :** `Sanction #42` pour le 42ème avertissement/sanction sur ce serveur.

## Fonctionnalités des Warnings

- **Avertissements persistants** : Les warnings restent jusqu'à suppression manuelle
- **Numérotation unique** : Chaque warning a un numéro de sanction
- **Messages privés** : L'utilisateur reçoit un DM avec les détails
- **Historique complet** : Visible dans `modinfo` et `warnings`
- **Suppression ciblée** : Utilisation du numéro de sanction pour supprimer
