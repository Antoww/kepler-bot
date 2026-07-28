# Manager d’invitations

Le système suit les invitations séparément pour chaque serveur. Il compare le
nombre d’utilisations connu avant et après une arrivée, conserve l’historique
dans Supabase et prend également en charge le lien personnalisé (vanity URL)
des serveurs qui en disposent.

## Installation

Exécuter `database/migrations/20260728_add_invite_manager.sql` dans l’éditeur
SQL Supabase. Les tables utilisent la RLS sans politique publique : Kepler y
accède avec `SUPABASE_SERVICE_ROLE_KEY`.

Le bot doit avoir les permissions **Gérer le serveur**, **Voir le salon**,
**Envoyer des messages** et **Intégrer des liens** dans les salons choisis.

## Configuration

Dans `/settings` → **Invitations**, un administrateur peut :

- activer ou désactiver le manager ;
- choisir le salon des logs et celui des annonces d’arrivée ;
- personnaliser le texte avec les variables `{membre}`, `{membre_nom}`,
  `{serveur}`, `{code}`, `{inviteur}`, `{utilisations}`, `{membres}` et
  `{canal}` ;
- afficher ou masquer le lien, son créateur, son nombre d’arrivées, son salon,
  le nombre de membres et l’âge du compte ;
- journaliser la création, la suppression et l’utilisation des liens.

Les commandes `/invitations classement` et `/invitations membre` consultent
les statistiques enregistrées. Une invitation peut rester inconnue lorsque
Discord ne fournit pas les données nécessaires, notamment si les permissions
du bot sont insuffisantes ou si plusieurs arrivées sont traitées simultanément.
