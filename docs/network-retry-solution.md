# Gestion des erreurs réseau et retry automatique

## Problème résolu

Le bot rencontrait occasionnellement des erreurs de connexion lors des requêtes vers Supabase, notamment :
- `connection reset`
- `connection error`
- Timeouts réseau temporaires

Ces erreurs étaient particulièrement visibles lors des vérifications périodiques (sanctions, rappels, anniversaires).

## Solution implémentée

### 1. Utilitaire de retry (`utils/retryHelper.ts`)

Un système de retry automatique avec backoff exponentiel a été créé :

```typescript
// Retry automatique avec configuration personnalisable
withRetry(fn, {
  maxRetries: 3,        // Nombre de tentatives
  baseDelay: 1000,      // Délai initial en ms
  maxDelay: 10000,      // Délai maximum en ms
  onRetry: (attempt, error) => { /* callback */ }
})

// Version simplifiée pour les appels réseau
withNetworkRetry(fn, context)
```

**Fonctionnalités :**
- Backoff exponentiel : 1s → 2s → 4s
- Détection automatique des erreurs réseau
- Logging des tentatives
- Abandon après 3 échecs

### 2. Détection des erreurs réseau

La fonction `isNetworkError()` identifie les erreurs temporaires :
- connection reset
- connection error
- network error
- ECONNRESET
- ETIMEDOUT
- fetch failed

### 3. Application aux fonctions critiques

Les fonctions suivantes ont été protégées avec retry automatique :

**Base de données (`database/db.ts`):**
- `getExpiredTempBans()` - Vérification des bans temporaires expirés
- `getExpiredTempMutes()` - Vérification des mutes temporaires expirés
- `getExpiredReminders()` - Vérification des rappels expirés
- `getBirthdaysForDate()` - Récupération des anniversaires

**Managers (`events/core/`):**
- `ModerationManager` - Gestion améliorée des erreurs avec distinction réseau/autre
- `ReminderManager` - Logging amélioré pour les erreurs réseau
- `BirthdayManager` - Gestion des erreurs réseau par serveur

## Comportement

### Avant
```
❌ Erreur lors de la vérification des bans temporaires: {
  message: "connection reset",
  ...
}
```
→ L'opération échouait immédiatement

### Après
```
⚠️ Tentative 1/3 pour récupération des bans temporaires expirés échouée: connection reset
⚠️ Tentative 2/3 pour récupération des bans temporaires expirés échouée: connection reset
✅ Opération réussie à la tentative 3
```
→ Retry automatique avec succès

Ou si toutes les tentatives échouent :
```
⚠️ Tentative 1/3 pour récupération des bans temporaires expirés échouée: connection reset
⚠️ Tentative 2/3 pour récupération des bans temporaires expirés échouée: connection reset
⚠️ Tentative 3/3 pour récupération des bans temporaires expirés échouée: connection reset
⚠️ Erreur réseau lors de la vérification des bans temporaires (sera réessayé): connection reset
```
→ L'erreur est loggée comme warning et sera retentée au prochain cycle (1 minute)

## Avantages

1. **Résilience accrue** : Les erreurs réseau temporaires ne font plus échouer les opérations
2. **Meilleure expérience** : Les utilisateurs ne manquent plus leurs rappels/sanctions
3. **Logs améliorés** : Distinction claire entre erreurs réseau et erreurs applicatives
4. **Performance** : Pas d'impact sur les performances normales
5. **Maintenabilité** : Système centralisé facile à étendre

## Configuration Docker

Pour réduire les erreurs réseau dans Docker, vous pouvez aussi :

### Option 1 : Ajuster le timeout du client Supabase

Dans `database/supabase.ts`, vous pouvez configurer un timeout plus long :

```typescript
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Timeout de 30 secondes
        signal: AbortSignal.timeout(30000)
      });
    }
  }
});
```

### Option 2 : Configuration réseau Docker

Dans `docker-compose.yml`, vous pouvez ajuster les paramètres réseau :

```yaml
services:
  bot:
    # ... autres configurations
    sysctls:
      - net.ipv4.tcp_keepalive_time=60
      - net.ipv4.tcp_keepalive_intvl=10
      - net.ipv4.tcp_keepalive_probes=6
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

## Tests

Pour tester le système de retry :

1. Simuler une erreur réseau temporaire
2. Vérifier les logs pour voir les tentatives
3. Confirmer que l'opération réussit finalement

## Extension future

Pour ajouter le retry à d'autres fonctions :

```typescript
// Dans database/db.ts
export async function maNouvelleFonction() {
  return withNetworkRetry(async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }, 'description de l\'opération');
}
```

## Notes importantes

- Le retry n'est appliqué qu'aux erreurs réseau détectées
- Les erreurs applicatives (validation, permissions, etc.) ne sont pas retentées
- Chaque retry a un délai croissant pour éviter de surcharger le serveur
- Les managers continuent à fonctionner même en cas d'erreur (réessai au cycle suivant)
