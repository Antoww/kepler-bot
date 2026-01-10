#!/usr/bin/env deno run --allow-read --allow-write

/**
 * Script de migration pour remplacer console.log par le logger centralisé
 * Usage: deno run --allow-read --allow-write scripts/migrate-logs.ts
 */

import * as path from "jsr:@std/path";

interface Replacement {
    pattern: RegExp;
    replacement: string;
}

// Patterns de remplacement courants
const replacements: Replacement[] = [
    // console.log simples
    { pattern: /console\.log\(/g, replacement: 'logger.info(' },
    
    // console.error
    { pattern: /console\.error\(/g, replacement: 'logger.error(' },
    
    // console.warn
    { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
    
    // Logs avec emojis de succès
    { pattern: /console\.log\(`✅/g, replacement: 'logger.success(`' },
    { pattern: /console\.log\(`🎉/g, replacement: 'logger.success(`' },
    
    // Logs avec emojis d'erreur
    { pattern: /console\.log\(`❌/g, replacement: 'logger.error(`' },
    { pattern: /console\.error\(`❌/g, replacement: 'logger.error(`' },
    
    // Logs avec emojis d'avertissement
    { pattern: /console\.log\(`⚠️/g, replacement: 'logger.warn(`' },
    { pattern: /console\.warn\(`⚠️/g, replacement: 'logger.warn(`' },
    
    // Logs avec catégories en préfixe
    { pattern: /\[LOG : \${new Date\(\)\.toLocaleTimeString\(\)}\] /g, replacement: '' },
    { pattern: /\[LOG : \${new Date\(\)\.toLocaleDateString\(\)}\] /g, replacement: '' },
];

async function migrateFile(filePath: string): Promise<boolean> {
    try {
        let content = await Deno.readTextFile(filePath);
        const originalContent = content;
        
        // Vérifier si le fichier utilise déjà le logger
        if (content.includes("import { logger } from") || content.includes("from './logger.ts'")) {
            console.log(`⏭️  Déjà migré: ${filePath}`);
            return false;
        }
        
        // Vérifier si le fichier contient des console.log/error/warn
        if (!content.match(/console\.(log|error|warn|info)/)) {
            return false;
        }
        
        // Appliquer les remplacements
        for (const { pattern, replacement } of replacements) {
            content = content.replace(pattern, replacement);
        }
        
        // Ajouter l'import du logger si nécessaire
        if (content !== originalContent && !content.includes("from './logger.ts'")) {
            const importStatement = getLoggerImport(filePath);
            content = addImport(content, importStatement);
        }
        
        // Écrire le fichier modifié
        if (content !== originalContent) {
            await Deno.writeTextFile(filePath, content);
            console.log(`✅ Migré: ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Erreur lors de la migration de ${filePath}:`, error);
        return false;
    }
}

function getLoggerImport(filePath: string): string {
    // Déterminer le chemin relatif vers utils/logger.ts
    const depth = filePath.split('/').length - Deno.cwd().split('/').length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : './';
    return `import { logger } from '${prefix}utils/logger.ts';`;
}

function addImport(content: string, importStatement: string): string {
    // Trouver la dernière ligne d'import
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
            lastImportIndex = i;
        }
    }
    
    if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, importStatement);
    } else {
        lines.unshift(importStatement);
    }
    
    return lines.join('\n');
}

async function migrateDirectory(dirPath: string): Promise<{ migrated: number; skipped: number }> {
    let migrated = 0;
    let skipped = 0;
    
    for await (const entry of Deno.readDir(dirPath)) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory && !entry.name.startsWith('.')) {
            const result = await migrateDirectory(fullPath);
            migrated += result.migrated;
            skipped += result.skipped;
        } else if (entry.isFile && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
            // Ignorer les fichiers spéciaux
            if (entry.name === 'logger.ts' || fullPath.includes('node_modules')) {
                continue;
            }
            
            const success = await migrateFile(fullPath);
            if (success) {
                migrated++;
            } else {
                skipped++;
            }
        }
    }
    
    return { migrated, skipped };
}

// Main
if (import.meta.main) {
    console.log('🔄 Démarrage de la migration des logs...\n');
    
    const dirs = ['commands', 'events', 'utils', 'database'];
    let totalMigrated = 0;
    let totalSkipped = 0;
    
    for (const dir of dirs) {
        const dirPath = path.join(Deno.cwd(), dir);
        try {
            console.log(`\n📁 Migration de ${dir}/...`);
            const { migrated, skipped } = await migrateDirectory(dirPath);
            totalMigrated += migrated;
            totalSkipped += skipped;
            console.log(`   ✅ ${migrated} fichier(s) migré(s), ⏭️  ${skipped} ignoré(s)`);
        } catch (error) {
            console.error(`❌ Erreur lors de la migration de ${dir}:`, error);
        }
    }
    
    console.log(`\n🎉 Migration terminée!`);
    console.log(`   Total: ${totalMigrated} fichier(s) migré(s), ${totalSkipped} ignoré(s)\n`);
    console.log(`⚠️  IMPORTANT: Vérifiez manuellement les fichiers migrés et ajustez si nécessaire.`);
    console.log(`   Certains logs peuvent nécessiter des ajustements manuels pour la catégorie.`);
}
