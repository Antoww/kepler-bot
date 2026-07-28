# Système de Logging Centralisé

## Vue d'ensemble

Le bot utilise maintenant un système de logging centralisé situé dans `utils/logger.ts`. Ce système remplace tous les `console.log()` dispersés dans le code pour offrir une expérience de logging cohérente et professionnelle.

## Avantages

✅ **Logs uniformes** : Format consistant avec timestamps et catégories  
✅ **Niveaux de priorité** : DEBUG, INFO, WARN, ERROR, SUCCESS  
✅ **Filtrage facile** : Configuration via variable d'environnement  
✅ **Catégorisation** : Identifiez rapidement la source des logs  
✅ **Moins de bruit** : Suppression des logs redondants  

## Configuration

### Niveau de log

Ajoutez dans votre fichier `.env` :

```env
LOG_LEVEL=INFO  # Options: DEBUG, INFO, WARN, ERROR
```

- **DEBUG** : Tous les logs (développement)
- **INFO** : Logs informatifs et supérieurs (par défaut)
- **WARN** : Avertissements et erreurs uniquement
- **ERROR** : Erreurs uniquement (production)

## Utilisation

### Import

```typescript
import { logger } from './utils/logger.ts';
```

### Méthodes de base

```typescript
// Logs de debug (détails techniques)
logger.debug('Message de debug', data, 'CATEGORY');

// Logs informatifs
logger.info('Bot démarré', undefined, 'BOT');

// Avertissements
logger.warn('Tentative de reconnexion', error.message, 'DATABASE');

// Erreurs
logger.error('Échec de connexion', error, 'DATABASE');

// Succès
logger.success('Commandes enregistrées', { count: 42 }, 'BOT');
```

### Méthodes spécialisées

```typescript
// Log de commande
logger.command('ping', '123456789', 'User#1234');

// Log d'événement
logger.event('guildMemberAdd', 'Nouveau membre rejoint');

// Log de base de données
logger.database('Utilisateur créé', { userId: '123' });

// Log de gestionnaire
logger.manager('BirthdayManager', 'démarré');

// Log d'API externe
logger.api('Pastebin', 'upload', 'success', { url: 'https://...' });
```

## Format des logs

```
HH:MM:SS 🔍 [CATEGORY] Message {data}
HH:MM:SS ℹ️ [BOT] Bot connecté: Kepler#1234
HH:MM:SS ⚠️ [DATABASE] Tentative de reconnexion
HH:MM:SS ❌ [COMMAND] Erreur commande ping
HH:MM:SS ✅ [API] Pastebin: upload
```

## Catégories courantes

- **BOT** : Démarrage, arrêt, états généraux
- **LOADER** : Chargement des commandes et événements
- **COMMAND** : Exécution des commandes
- **EVENT** : Événements Discord
- **DATABASE** : Opérations de base de données
- **MANAGER** : Gestionnaires (Birthday, Moderation, RGPD, Reminder)
- **API** : Appels API externes (Pastebin, etc.)
- **RGPD** : Opérations de purge de données
- **Reminders** : Système de rappels
- **StatsTracker** : Tracking des statistiques
- **Pastebin** : Upload d'archives
- **Archiver** : Archivage de messages
- **Giveaway** : Système de giveaways

## Migration depuis console.log

### Avant
```typescript
console.log(`[LOG : ${new Date().toLocaleTimeString()}] Bot connecté: ${client.user.tag}`);
console.error('Erreur lors du chargement:', error);
```

### Après
```typescript
logger.success(`Bot connecté: ${client.user.tag}`, undefined, 'BOT');
logger.error('Erreur lors du chargement', error, 'LOADER');
```

## Bonnes pratiques

1. **Utilisez le bon niveau** : DEBUG pour détails, INFO pour infos, WARN pour avertissements, ERROR pour erreurs
2. **Soyez concis** : Messages courts et clairs
3. **Utilisez les catégories** : Facilite le filtrage et la recherche
4. **Évitez les logs verbeux** : Ne loguez pas chaque action triviale en INFO
5. **Contextualisez les erreurs** : Fournissez l'objet d'erreur complet

## Fichiers mis à jour

### Core
- ✅ `index.ts`
- ✅ `events/core/ready.ts`
- ✅ `managers/rgpdManager.ts`
- ✅ `managers/reminderManager.ts`

### Utils
- ✅ `utils/logger.ts` (nouveau)
- ✅ `utils/messageArchiver.ts`
- ✅ `utils/archiveCache.ts`
- ✅ `utils/statsTracker.ts`
- ✅ `utils/rgpdData.ts`
- ✅ `utils/moderationLogger.ts`

### Prochaines mises à jour recommandées
- `managers/moderationManager.ts`
- `events/core/interactionCreate.ts`
- `managers/birthdayManager.ts`
- `managers/giveawayManager.ts`
- `managers/countingManager.ts`
- `commands/*` (toutes les commandes)
- `events/handlers/*` (tous les handlers)
- `events/logs/*` (tous les logs d'événements)

## Exemple de sortie

```
14:23:45 ℹ️ [BOT] Bot connecté: Kepler#1234
14:23:45 ℹ️ [BOT] Prêt sur 3 serveur(s)
14:23:46 ✅ [DATABASE] Base de données initialisée
14:23:46 ✅ [MANAGER] Gestionnaire d'anniversaires démarré
14:23:46 ✅ [MANAGER] Gestionnaire de modération démarré
14:23:46 ✅ [MANAGER] Gestionnaire RGPD démarré (90 jours)
14:23:46 ✅ [BOT] 42 commande(s) slash enregistrée(s)
14:23:46 ✅ [BOT] Bot prêt !
```

## Support

Pour toute question ou problème avec le système de logging, consultez le code dans `utils/logger.ts` ou créez une issue.
