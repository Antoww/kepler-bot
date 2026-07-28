# Fuseaux horaires par serveur

Chaque serveur configure son fuseau dans `/settings` → **Fuseau**. La valeur
est un identifiant IANA, par exemple `Europe/Paris`, `America/Montreal` ou
`Indian/Reunion`. Le défaut est `Europe/Paris`.

Les identifiants IANA sont utilisés à la place d'un décalage UTC fixe afin de
gérer automatiquement les changements d'heure.

## Fonctionnalités concernées

- périodes de boost XP ;
- rappels créés avec une date et une heure ;
- déclenchement quotidien des anniversaires ;
- date journalière des statistiques propres au serveur.

Les durées relatives (`2h`, `7j`), les expirations techniques et les sanctions
temporaires restent calculées en durée absolue. Les balises Discord `<t:...>`
sont conservées : Discord les affiche directement dans le fuseau de chaque
utilisateur.

## Format de saisie

Les dates locales utilisent :

```text
jj/mm/aaaa hh:mm
```

Elles sont converties en UTC avant stockage. Une date inexistante pendant un
changement d'heure est refusée.

## Migration

Exécuter `database/migrations/20260728_add_server_timezone.sql` dans Supabase.
