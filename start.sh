#!/bin/bash

# Nettoyer les modules Deno corrompus
echo "🧹 Nettoyage des modules Deno..."
rm -rf node_modules/.deno

# Attendre que MariaDB soit prêt
echo "⏳ Attente de MariaDB..."
until nc -z mariadb 3306; do
  echo "MariaDB n'est pas encore prêt, attente..."
  sleep 2
done
echo "✅ MariaDB est prêt !"

# Démarrer le bot
echo "🚀 Démarrage du bot Discord..."
deno run --allow-all index.ts 