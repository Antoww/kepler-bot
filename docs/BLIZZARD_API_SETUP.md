# 🎮 Guide de Configuration API Blizzard Battle.net

## 📋 Étapes de Configuration

### 1. Création du Client sur Battle.net

1. **Accès au portail**
   - Allez sur https://develop.battle.net/
   - Connectez-vous avec votre compte Battle.net
   - Cliquez sur "API Access" → "Manage Your Clients"

2. **Création du client**
   - **Client Name**: `Keplerr` (ou nom de votre bot)
   - **Redirect URLs**: Laissez vide ou `https://localhost:3000/callback`
   - **Service URL**: Cochez "I do not have a service URL for this client"
   - **Intended Use**: 
     ```
     Discord bot pour fournir des informations sur les guildes et personnages World of Warcraft. 
     Récupération des données de guildes, progression raid, et statistiques de personnages 
     pour la communauté Discord.
     ```

### 2. Configuration des Variables d'Environnement dans Dokploy

Dans votre interface Dokploy, ajoutez ces variables d'environnement :

```env
# API Blizzard Battle.net
BLIZZARD_CLIENT_ID=votre_client_id_ici
BLIZZARD_CLIENT_SECRET=votre_client_secret_ici
```

**Important** : Les variables sont automatiquement disponibles via `Deno.env.get()` dans votre application.

### 3. Test de la Configuration

Utilisez la commande Discord intégrée :

```
/testapi
```

Cette commande (réservée aux administrateurs) vérifie :
- ✅ Connectivité Raider.IO
- ✅ Authentification Blizzard API  
- ✅ Base de données Supabase
- ✅ Variables d'environnement

## 🔧 Fonctionnalités Ajoutées

### Données Enrichies Disponibles

Avec l'API Blizzard, la commande `/wowguilde` affiche maintenant :

- ✅ **Données Raider.IO** (progression, classements)
- ✅ **Nombre de membres** (Blizzard API)
- ✅ **Faction** (Alliance/Horde)
- ✅ **Points de hauts faits**
- ✅ **Date de création** de la guilde

### Fallback Automatique

- Si l'API Blizzard n'est pas configurée → Utilise seulement Raider.IO
- Si l'API Blizzard est configurée → Combine les deux sources
- Sources affichées dans le footer de l'embed

## 🎯 APIs Supportées

| API | Status | Données Fournies |
|-----|--------|------------------|
| **Raider.IO** | ✅ Principal | Progression raids, classements M+ |
| **Blizzard Battle.net** | ✅ Optionnel | Infos détaillées guildes, membres |
| **WarcraftLogs** | 🔄 En préparation | Logs de combat, performances |
| **WoWProgress** | 🔄 En préparation | Classements mondiaux |

## 🛠️ Utilisation

```typescript
import { WoWAPIClient } from '../utils/wowApiClient.js';

const apiClient = new WoWAPIClient();

// Test de connectivité
await apiClient.testBlizzardConnection();

// Récupération de données enrichies
const guildData = await apiClient.getEnhancedGuildData('eu', 'hyjal', 'ma-guilde');
console.log(guildData.data_sources); // ['Raider.IO', 'Blizzard API']
```

## 🔒 Sécurité

- ❌ Ne commitez JAMAIS vos clés API
- ✅ Utilisez les variables d'environnement Dokploy
- ✅ Commande `/testapi` pour vérifier la configuration
- ✅ Tokens Blizzard automatiquement renouvelés

## 📊 Limitations

- **Raider.IO**: Pas de limite stricte, données en cache
- **Blizzard API**: 100 requêtes/seconde, 36,000/heure
- **Token Blizzard**: Expire après 24h (auto-renouvelé)

## 🐛 Dépannage

### Erreur d'authentification Blizzard
```
❌ Variables d'environnement manquantes
```
→ Vérifiez que `BLIZZARD_CLIENT_ID` et `BLIZZARD_CLIENT_SECRET` sont dans `.env`

### Guilde non trouvée
```
❌ Guilde non trouvée
```
→ Vérifiez l'orthographe du nom de guilde et serveur

### API temporairement indisponible
→ Le bot utilise automatiquement Raider.IO en fallback

### Test de connectivité
```
/testapi
```
→ Vérifie toutes les APIs et variables d'environnement
