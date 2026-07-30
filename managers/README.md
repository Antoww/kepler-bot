# Managers

Services persistants démarrés par l’événement `ready`.

| Fichier | Responsabilité |
| --- | --- |
| `birthdayManager.ts` | Vérifications quotidiennes selon le fuseau du serveur |
| `countingManager.ts` | Traitement du jeu de comptage |
| `giveawayManager.ts` | Planification et clôture des giveaways |
| `moderationManager.ts` | Expiration des sanctions temporaires |
| `reminderManager.ts` | Planification et livraison des rappels |
| `rgpdManager.ts` | Purge périodique des données expirées |
| `xpManager.ts` | Suivi des périodes et événements XP |

Un manager ne doit pas exporter de commande ou d’événement Discord. Les
événements restent dans `events/`, et les opérations métier réutilisables dans
`utils/`.
