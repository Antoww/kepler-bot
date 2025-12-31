# Système de Comptage 🎮

## Description

Le système de comptage est un mini-jeu où les membres du serveur comptent ensemble jusqu'à l'infini. Les utilisateurs doivent compter à tour de rôle sans répéter deux nombres de suite.

## Commandes

### `/count channel [CANAL]`
Configure le canal où se déroulera le jeu de comptage. Seuls les administrateurs du serveur peuvent exécuter cette commande.

**Usage:**
```
/count channel #comptage
```

**Effet:**
- Active le jeu de comptage dans le canal spécifié
- Réinitialise le compteur à 0
- Envoie un message d'accueil dans le canal

### `/count stop`
Arrête le jeu de comptage en cours sur le serveur.

**Usage:**
```
/count stop
```

**Effet:**
- Arrête le jeu de comptage
- Affiche le score final atteint

## Règles du Jeu

1. **Compter à tour de rôle** : Chaque personne envoie le nombre suivant (1, 2, 3, ...)
2. **Pas de double comptage** : Un utilisateur ne peut pas compter deux fois de suite
3. **Nombre correct** : Le nombre envoyé doit être exactement le suivant attendu
4. **Messages supprimés** : Les messages incorrects sont automatiquement supprimés

## Comportement

### Comptage Valide ✅
- Le message reçoit une réaction ✅
- Le compteur est mis à jour
- Les autres utilisateurs peuvent continuer

### Comptage Invalide ❌

**Mauvais nombre:**
- Le message est supprimé
- Un message d'erreur s'affiche pendant 3 secondes indiquant le nombre attendu

**Double comptage (même utilisateur deux fois de suite):**
- Le message est supprimé
- Un message d'erreur s'affiche pendant 3 secondes

### Jalons 🎉
- Tous les 10 nombres (10, 20, 30, etc.), un message de jalon s'affiche
- Félicite l'utilisateur qui a atteint le jalon

## Exemple d'Utilisation

1. Admin configure le canal: `/count channel #comptage`
2. Bot envoie un message de bienvenue dans #comptage
3. L'utilisateur A envoie "1"
4. L'utilisateur B envoie "2"
5. L'utilisateur C envoie "3"
6. ...et ainsi de suite!

Si L'utilisateur A envoie "4" immédiatement après son "1", son message est supprimé avec un message d'erreur.

## Données Stockées

Le système utilise Supabase pour stocker:
- `guild_id`: ID du serveur
- `channel_id`: ID du canal de comptage
- `current_count`: Le nombre actuel
- `last_user_id`: L'ID du dernier utilisateur qui a compté
- `created_at`: Date de création de la configuration
- `updated_at`: Date de dernière mise à jour
