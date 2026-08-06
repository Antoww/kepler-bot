# Roadmap de Kepler

Cette roadmap présente la direction prévue pour Kepler après la version 1.1.
Les périodes annoncées sont indicatives : le contenu et le nombre de versions
intermédiaires pourront évoluer selon les retours, les besoins techniques et le
niveau de qualité attendu avant Kepler 2.0.

## Vision

Kepler a vocation à devenir un centre de contrôle polyvalent pour administrer,
automatiser et analyser des communautés Discord. Le bot doit rester un couteau
suisse accessible tout en proposant des outils de gestion spécialisés rarement
réunis dans une même application : audit de configuration, santé du serveur,
mode incident, workflows administratifs et gestion de réseaux de serveurs.

## Principes directeurs

- Construire des modules complets plutôt qu'une accumulation de commandes
  isolées.
- Centraliser les réglages et conserver une navigation cohérente.
- Migrer progressivement les interfaces vers Discord Components V2.
- Rendre chaque module observable, configurable et sûr par défaut.
- Préparer l'architecture distribuée sans ralentir les versions 1.x.

À partir de la V1.2, tout module fonctionnellement modifié doit migrer vers
Components V2. Chaque version inclura également un lot de modernisation des
interfaces existantes. L'objectif est de ne conserver aucun embed classique à
l'approche de Kepler 2.0.

## V1.1 — Modération, statistiques et expérience

**Période visée : août 2026 — qualification en cours**

- Auto-modération enrichie : observation, filtres personnalisés, seuils,
  exemptions et sanctions par règle.
- Centre de configuration `/settings` réorganisé et migré vers Components V2.
- Graphiques serveur plus lisibles et suivi des arrivées et départs.
- Expérience serveur améliorée : cooldown, boosts, récompenses, journaux et
  interfaces V2.
- Commandes d'invitations modernisées et classements paginés.
- Navigation directe par numéro de page pour les classements.
- Meilleure prise en charge des emojis dans les graphiques.

## V1.2 — Communauté et identité serveur

**Période visée : fin août 2026**

- Messages d'accueil et de départ avancés.
- Messages privés d'accueil.
- Rôles automatiques et rôles interactifs.
- Amélioration des anniversaires et des profils communautaires.
- Prévisualisation des messages avant publication.
- Statistiques de rétention et qualité des sources d'invitation.
- Migration V2 des anniversaires, jeux communautaires et commandes
  d'information générales.
- Première version du kit d'interface partagé de Kepler.

## V1.3 — Administration intelligente

**Période visée : septembre 2026**

- Audit global de la configuration.
- Détection des salons, rôles et références devenus invalides.
- Contrôle des permissions et de la hiérarchie des rôles.
- Détection des accès sensibles ou incohérents.
- Score de santé du serveur et recommandations exploitables.
- Sauvegarde, restauration et export de configuration.
- Historique des changements administratifs.
- Assistant de nettoyage des configurations obsolètes.
- Migration V2 des commandes d'administration et des journaux.

## V1.4 — Automatisation et workflows

**Période visée : fin septembre ou début octobre 2026**

- Messages récurrents et rappels de bump.
- Messages persistants et publications planifiées.
- Attribution temporaire de rôles.
- Ouverture et fermeture programmées de salons.
- Déclencheurs et actions personnalisables.
- Workflows liés aux arrivées, départs, niveaux et incidents.
- Historique et reprise des automatisations après redémarrage.
- Mode incident automatisé.
- Première mise à jour majeure du dashboard pour gérer les automatisations.

## V1.5 — Exploitation et préparation au changement d'échelle

**Période visée : octobre 2026**

- Tableau de santé du bot par serveur.
- Métriques de performance et suivi des erreurs par fonctionnalité.
- Statistiques opérationnelles avancées.
- Analyse de l'activité de modération, des tickets et des signalements.
- Amélioration des caches et des tâches planifiées.
- Deuxième phase du dashboard et premières fonctions multi-serveurs.
- Suppression des derniers embeds classiques.
- Préparation des managers, caches et collecteurs au sharding.

## Versions intermédiaires éventuelles

**Période possible : novembre 2026**

Kepler pourra recevoir des versions V1.6, V1.7 ou correctives avant la V2.0.
Elles permettront d'intégrer les retours utilisateurs, de stabiliser le
dashboard, d'expérimenter de nouveaux outils spécialisés ou d'ajouter des
prérequis techniques au sharding.

## Kepler 2.0 — Architecture distribuée

**Objectif indicatif : fin 2026**

- Sharding Discord.
- Exécution sur plusieurs processus ou instances.
- Coordination distribuée des caches et tâches planifiées.
- Supervision centralisée et reprise après incident.
- Dashboard multi-serveurs complet.
- Gestion de réseaux de serveurs et politiques partagées.
- Modèles de configuration réutilisables.
- Architecture modulaire durable pour la montée en charge.

