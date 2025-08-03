# 🚀 Configuration Dokploy - API Blizzard

## Variables d'Environnement Requises

Dans votre interface Dokploy, ajoutez ces variables :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `BLIZZARD_CLIENT_ID` | Client ID de l'API Blizzard | `a1b2c3d4e5f6g7h8` |
| `BLIZZARD_CLIENT_SECRET` | Client Secret de l'API Blizzard | `x1y2z3a4b5c6d7e8f9` |

## ✅ Vérification Post-Déploiement

Une fois les variables ajoutées et le bot redéployé :

1. **Test rapide** : Utilisez `/testapi` sur Discord
2. **Test fonctionnel** : Utilisez `/wowguilde` avec une guilde existante

## 📊 Exemple de Test

```
/wowguilde serveur:Hyjal guilde:Method region:eu
```

**Résultat attendu** :
- Footer indiquant : `Sources: Raider.IO, Blizzard API`
- Informations supplémentaires : membres, faction, points de hauts faits

## 🔧 Dépannage Dokploy

### Variables non prises en compte
1. Vérifiez l'orthographe exacte des noms de variables
2. Redéployez l'application après ajout des variables
3. Utilisez `/testapi` pour confirmer la lecture

### Erreur d'authentification Blizzard
- Vérifiez la validité des clés sur https://develop.battle.net/
- Contrôlez les restrictions d'IP si configurées

### Performance
- L'API Blizzard peut être plus lente que Raider.IO
- Le fallback automatique assure la continuité de service

## 🎯 Avantages

| Avant | Après |
|-------|--------|
| Données Raider.IO uniquement | Données combinées Raider.IO + Blizzard |
| Progression raids seulement | + Membres, faction, points de hauts faits |
| Fiabilité moyenne | Très haute fiabilité |
