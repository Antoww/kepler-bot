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
- **Mots et expressions** : termes personnalisés, exceptions et expressions
  régulières, avec normalisation des accents et caractères invisibles.
- **Messages modifiés** : une édition repasse dans les filtres de contenu sans
  être comptée comme un nouveau message dans les seuils de spam.
- **Anti-raid** : une rafale d’arrivées active temporairement une protection
  renforcée des comptes très récents.

Les administrateurs et les membres possédant **Gérer les messages** sont
toujours exemptés. Des rôles, salons et catégories supplémentaires peuvent
être exclus dans `/settings` → **Modération**.

## Actions

- `delete` : suppression du message ;
- `warn` : suppression et avertissement enregistré dans les sanctions ;
- `timeout` : suppression puis timeout après un nombre configurable
  d’infractions dans une fenêtre glissante.

Les actions peuvent être définies par règle. Une progression peut ensuite les
remplacer selon le nombre d’infractions, par exemple
`1=delete,2=warn,3=timeout:600`. Le **mode observation** enregistre et journalise
les détections sans supprimer le message ni sanctionner le membre.

Le panneau affiche le volume des détections des sept derniers jours. Les
déclenchements des règles AutoMod natives de Discord sont également intégrés à
l’historique Kepler lorsque les intents correspondants sont disponibles.

## Navigation dans `/settings`

La rubrique **Modération** centralise désormais l’AutoMod, les sanctions et le
rôle de mute, les signalements ainsi que le journal de modération. L’AutoMod
est lui-même divisé en cinq écrans : **Général**, **Protections**, **Filtres et
seuils**, **Sanctions** et **Exemptions**. Chaque sauvegarde ramène dans son
écran d’origine afin d’éviter de recommencer la navigation.

Les autres modules suivent la même convention :

- **Invitations** : Général, Salons, Événements journalisés et Annonce
  d’arrivée ;
- **Tickets** : résumé, Emplacements et accès, Apparence du panneau et
  Publication ;
- **Expérience** : Général, Boosts, Récompenses, Exclusions et Journal.

Les écrans simples, comme les logs serveur, les anniversaires et le fuseau
horaire, restent accessibles directement depuis l’accueil.

Chaque détection est conservée dans `guild_automod_violations` et envoyée dans
le salon de modération configuré. Si le bot ne peut pas appliquer un timeout,
le message reste supprimé et l’échec n’empêche pas le traitement des messages
suivants.

Lorsque les notifications sont activées, Kepler avertit l’utilisateur avec un
embed en message privé. Aucun avertissement public n’est envoyé dans le salon ;
si les messages privés sont fermés, seule l’équipe voit le log de modération.
Les MP sont limités à un toutes les 15 secondes par utilisateur afin qu’une
rafale ne soit pas remplacée par une rafale de notifications du bot.

## Mise à niveau V1.1

Après la migration initiale, exécuter
`database/migrations/20260804_extend_automod_v1_1.sql` dans Supabase. La
migration est additive et conserve les réglages existants.
