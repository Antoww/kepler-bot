import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Script de bump de version automatique
 * Usage: deno run --allow-read --allow-write bump-version.ts [major|minor|patch]
 */

interface Version {
    version: string;
    codename: string;
    releaseDate: string;
    changelog: string;
}

type BumpType = 'major' | 'minor' | 'patch';

function parseVersion(version: string): [number, number, number] {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
        throw new Error(`Version invalide: ${version}`);
    }
    return parts as [number, number, number];
}

function bumpVersion(version: string, type: BumpType): string {
    const [major, minor, patch] = parseVersion(version);

    switch (type) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
            return `${major}.${minor}.${patch + 1}`;
    }
}

function getCurrentDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

async function main() {
    const args = Deno.args;
    const bumpType = (args[0] || 'patch') as BumpType;

    if (!['major', 'minor', 'patch'].includes(bumpType)) {
        console.error('❌ Type de bump invalide. Utilisez: major, minor, ou patch');
        Deno.exit(1);
    }

    const versionPath = path.join(Deno.cwd(), 'version.json');

    // Lire la version actuelle
    const versionFile = await fs.promises.readFile(versionPath, 'utf-8');
    const versionData: Version = JSON.parse(versionFile);

    const oldVersion = versionData.version;
    const newVersion = bumpVersion(oldVersion, bumpType);

    console.log(`📦 Bump de version: ${oldVersion} → ${newVersion} (${bumpType})`);

    // Demander un changelog
    const changelogPrompt = prompt('📝 Description des changements (optionnel):');
    const changelog = changelogPrompt || `Mise à jour ${bumpType}`;

    // Mettre à jour version.json
    versionData.version = newVersion;
    versionData.releaseDate = getCurrentDate();
    versionData.changelog = changelog;

    await fs.promises.writeFile(
        versionPath,
        JSON.stringify(versionData, null, 2),
        'utf-8'
    );

    console.log('✅ version.json mis à jour');

    // Mettre à jour CHANGELOG.md
    const changelogPath = path.join(Deno.cwd(), 'CHANGELOG.md');
    let changelogContent = '';

    try {
        changelogContent = await fs.promises.readFile(changelogPath, 'utf-8');
    } catch {
        // Créer le fichier s'il n'existe pas
        changelogContent = '# Changelog\n\nToutes les modifications notables de ce projet seront documentées dans ce fichier.\n\n';
    }

    const changelogEntry = `## [${newVersion}] - ${getCurrentDate()}\n\n${changelog}\n\n`;

    // Insérer après le header
    const headerEnd = changelogContent.indexOf('\n\n') + 2;
    const newChangelogContent = 
        changelogContent.slice(0, headerEnd) + 
        changelogEntry + 
        changelogContent.slice(headerEnd);

    await fs.promises.writeFile(changelogPath, newChangelogContent, 'utf-8');

    console.log('✅ CHANGELOG.md mis à jour');
    console.log('');
    console.log('🎉 Version bumped avec succès!');
    console.log('');
    console.log('📌 Prochaines étapes:');
    console.log('   1. git add version.json CHANGELOG.md');
    console.log(`   2. git commit -m "chore: bump version to ${newVersion}"`);
    console.log(`   3. git tag v${newVersion}`);
    console.log('   4. git push && git push --tags');
}

main().catch((error) => {
    console.error('❌ Erreur:', error);
    Deno.exit(1);
});
