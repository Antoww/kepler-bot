# Statistiques serveur

La commande `/graph` ouvre un panneau public réservé aux administrateurs. Le
message et ses graphiques sont visibles par tout le serveur ; seul
l’administrateur ayant lancé la commande peut utiliser ses composants.

## Vues disponibles

- **Résumé de l’activité** : messages, commandes, membres actuels et commandes
  les plus utilisées ;
- **Messages et commandes** : évolution quotidienne des deux volumes ;
- **Arrivées et départs** : deux courbes quotidiennes et solde net de membres ;
- **État actuel** : humains, bots, membres en ligne, rôles et boosts ;
- **Salons actifs** : salons classés par nombre de messages ;
- **Membres actifs** : membres classés par nombre de messages ;
- **Commandes utilisées** : commandes classées par nombre d’exécutions.

Les vues historiques acceptent les périodes de 7, 30, 90, 180 ou 360 jours,
ainsi que toute la période conservée en base.

## Arrivées et départs

Cette vue dépend de `guild_invite_joins`. Elle comptabilise toutes les arrivées
suivies par le manager d’invitations et les départs associés. Les données
antérieures à l’installation de ce suivi ne peuvent pas être reconstruites.

Exécuter `database/migrations/20260805_add_member_flow_stats.sql` pour installer
la fonction d’agrégation quotidienne utilisée par le graphique.

## Données et confidentialité

Les graphiques présentent des agrégats du serveur. Ils ne contiennent pas le
contenu des messages. Les classements affichent uniquement les noms visibles
sur le serveur et les volumes de messages associés.
