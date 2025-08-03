// Configuration API Blizzard - Utilisation des variables d'environnement uniquement

// Fonction pour récupérer les credentials Blizzard
export function getBlizzardCredentials() {
    console.log('🔍 [Config] Recherche des credentials Blizzard...');
    
    // Debug complet de l'environnement
    console.log('🔧 [Debug] Type de globalThis.Deno:', typeof globalThis.Deno);
    console.log('🔧 [Debug] globalThis.Deno existe:', !!globalThis.Deno);
    
    if (globalThis.Deno) {
        console.log('🔧 [Debug] Type de Deno.env:', typeof globalThis.Deno.env);
        console.log('🔧 [Debug] Deno.env existe:', !!globalThis.Deno.env);
        
        // Lister toutes les variables qui contiennent "BLIZZARD"
        // @ts-ignore
        const allEnv = globalThis.Deno.env.toObject();
        const blizzardKeys = Object.keys(allEnv).filter(key => 
            key.toUpperCase().includes('BLIZZARD')
        );
        console.log('🔧 [Debug] Variables contenant BLIZZARD:', blizzardKeys);
        
        // Test avec d'autres variables qui fonctionnent
        // @ts-ignore
        const testToken = globalThis.Deno?.env?.get('TOKEN');
        // @ts-ignore
        const testBlagues = globalThis.Deno?.env?.get('BLAGUES_API_TOKEN');
        
        console.log('🔧 [Debug] TOKEN trouvé:', testToken ? 'OUI' : 'NON');
        console.log('🔧 [Debug] BLAGUES_API_TOKEN trouvé:', testBlagues ? 'OUI' : 'NON');
    }
    
    // Variables d'environnement Blizzard
    // @ts-ignore - Deno global est disponible à l'exécution
    const envClientId = globalThis.Deno?.env?.get('BLIZZARD_CLIENT_ID');
    // @ts-ignore - Deno global est disponible à l'exécution  
    const envClientSecret = globalThis.Deno?.env?.get('BLIZZARD_CLIENT_SECRET');
    
    console.log('🔧 [Debug] BLIZZARD_CLIENT_ID brut:', envClientId);
    console.log('🔧 [Debug] BLIZZARD_CLIENT_SECRET brut:', envClientSecret);
    
    if (envClientId && envClientSecret) {
        console.log('✅ [Config] Variables d\'environnement trouvées');
        return { clientId: envClientId, clientSecret: envClientSecret };
    }
    
    console.log('❌ [Config] Variables BLIZZARD_CLIENT_ID et BLIZZARD_CLIENT_SECRET non trouvées');
    console.log('💡 [Config] Vérifiez votre configuration Dokploy ou les variables seront ignorées');
    return { clientId: null, clientSecret: null };
}
