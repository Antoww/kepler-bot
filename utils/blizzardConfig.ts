// Configuration API Blizzard - Utilisation des variables d'environnement uniquement

// Fonction pour récupérer les credentials Blizzard
export function getBlizzardCredentials() {
    console.log('🔍 [Config] Recherche des credentials Blizzard...');
    
    // Variables d'environnement uniquement
    // @ts-ignore - Deno global est disponible à l'exécution
    const envClientId = globalThis.Deno?.env?.get('BLIZZARD_CLIENT_ID');
    // @ts-ignore - Deno global est disponible à l'exécution  
    const envClientSecret = globalThis.Deno?.env?.get('BLIZZARD_CLIENT_SECRET');
    
    if (envClientId && envClientSecret) {
        console.log('✅ [Config] Variables d\'environnement trouvées');
        return { clientId: envClientId, clientSecret: envClientSecret };
    }
    
    console.log('❌ [Config] Variables BLIZZARD_CLIENT_ID et BLIZZARD_CLIENT_SECRET non trouvées');
    console.log('💡 [Config] Vérifiez votre configuration Dokploy ou les variables seront ignorées');
    return { clientId: null, clientSecret: null };
}
