# Architecture du projet

```text
commands/             Commandes slash et contextuelles, classées par usage
database/             Accès Supabase et migrations SQL
events/
  core/               Événements principaux : ready et interactions
  handlers/           Un fichier par événement Discord
  logs/               Construction des journaux d’événements Discord
managers/             Services persistants démarrés avec le bot
utils/
  moderation/        Archives et journal de modération
  privacy/           Données et conformité RGPD
  reports/           Signalements
  stats/             Tracking et graphiques
  tickets/           Gestion des tickets
  xp/                Progression et journal XP
  *.ts               Fondations transversales
docs/                 Documentation technique et fonctionnelle
changelogs/           Historique des versions
```

## Règles de rangement

- Une commande Discord appartient à `commands/<catégorie>/`.
- Un listener Discord appartient à `events/core` ou `events/handlers`.
- Une boucle, une planification ou un service à durée de vie longue appartient
  à `managers/`.
- Une fonction sans cycle de vie propre appartient à `utils/`.
- L’accès aux données passe par `database/`.
- Les migrations appliquées ne sont jamais supprimées, même lorsqu’une
  migration plus récente les remplace.

## Chargement

`index.ts` charge récursivement toutes les commandes. Les événements sont
chargés depuis une liste explicite afin que les fichiers de construction des
logs ne soient pas enregistrés par erreur comme listeners.

L’événement `ready` initialise les managers et l’enregistrement des commandes
Discord.
