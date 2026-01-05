# 📚 Documentation

Ce dossier contient la documentation technique et les guides de dépannage.

## 📁 Contenu

| Document | Description |
|----------|-------------|
| [NETWORK_FIX_README.md](NETWORK_FIX_README.md) | Guide de résolution des problèmes réseau |
| [network-retry-solution.md](network-retry-solution.md) | Solution de retry automatique |
| [rate-limits-solutions.md](rate-limits-solutions.md) | Gestion des rate limits Discord/Supabase |

---

## 🔧 Problèmes courants

### Erreurs réseau Supabase

Si vous rencontrez des erreurs `FetchError` ou `ECONNRESET` :

1. Vérifiez la connexion Internet
2. Le module `retryHelper.ts` gère automatiquement les retries
3. Consultez [network-retry-solution.md](network-retry-solution.md)

### Rate Limits Discord

Si le bot est rate-limited :

1. Les commandes seront temporairement ralenties
2. discord.js gère automatiquement les rate limits
3. Consultez [rate-limits-solutions.md](rate-limits-solutions.md)

---

## 📖 Guides à venir

- [ ] Guide de déploiement Docker
- [ ] Configuration Supabase
- [ ] Ajout de nouvelles commandes
- [ ] Système de logs
