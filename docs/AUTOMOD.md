# Auto-modération

L’AutoMod Kepler analyse les messages avant l’XP, les statistiques et les
mini-jeux. Sa configuration et son historique sont isolés par serveur.

## Installation

Exécuter `database/migrations/20260728_add_automod_system.sql` dans Supabase.
Les tables ont la RLS activée sans politique publique et sont accessibles par
le bot au moyen de `SUPABASE_SERVICE_ROLE_KEY`.

Le bot doit pouvoir **Gérer les messages**, **Modérer les membres**, voir le
salon de modération, y envoyer des messages et intégrer des liens.

## Protections

- **Liens externes** : détection des URL avec liste de domaines autorisés. Un
  domaine autorisé couvre aussi ses sous-domaines, sans autoriser les domaines
  ressemblants.
- **Invitations Discord** : les liens `discord.gg` et
  `discord.com/invite` sont vérifiés. Les invitations du serveur courant
  peuvent être autorisées séparément.
- **Rafales** : nombre de messages dans une fenêtre courte.
- **Doublons** : répétitions détectées après normalisation de la casse, des
  espaces et de la ponctuation.
- **Majuscules** : pourcentage configurable, appliqué uniquement après un
  nombre minimal de lettres.
- **Mentions massives** : utilisateurs, rôles, `@everyone` et `@here`.

Les administrateurs et les membres possédant **Gérer les messages** sont
toujours exemptés. Des rôles, salons et catégories supplémentaires peuvent
être exclus dans `/settings` → **Modération**.

## Actions

- `delete` : suppression du message ;
- `warn` : suppression et avertissement enregistré dans les sanctions ;
- `timeout` : suppression puis timeout après un nombre configurable
  d’infractions dans une fenêtre glissante.

Chaque détection est conservée dans `guild_automod_violations` et envoyée dans
le salon de modération configuré. Si le bot ne peut pas appliquer un timeout,
le message reste supprimé et l’échec n’empêche pas le traitement des messages
suivants.
