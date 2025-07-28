#!/bin/bash

# Script de nettoyage après migration vers Supabase
echo "🧹 Nettoyage des anciens fichiers MySQL..."

# Supprimer les anciens fichiers de base de données MySQL
echo "📁 Suppression des anciens fichiers MySQL..."
rm -f database/db.ts
rm -f database/init.sql
rm -f database/add_server_configs.sql

# Supprimer le script de migration (optionnel)
echo "📄 Suppression du script de migration..."
rm -f database/migrate_to_supabase.ts

# Mettre à jour package.json pour supprimer mysql2
echo "📦 Mise à jour des dépendances..."
npm uninstall mysql2

echo "✅ Nettoyage terminé !"
echo "📝 N'oubliez pas de :"
echo "  1. Configurer vos variables d'environnement Supabase"
echo "  2. Exécuter le script supabase_init.sql dans votre dashboard Supabase"
echo "  3. Tester votre bot avec la nouvelle configuration" 