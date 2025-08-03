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
        
        // Lister toutes les variables qui contiennent "BLIZZARD" ou "TEST"
        // @ts-ignore
        const allEnv = globalThis.Deno.env.toObject();
        const blizzardKeys = Object.keys(allEnv).filter(key => 
            key.toUpperCase().includes('BLIZZARD') || key.toUpperCase().includes('TEST') || key.toUpperCase().includes('BLIZZ') || key.toUpperCase().includes('SIMPLE')
        );
        console.log('🔧 [Debug] Variables contenant BLIZZARD/TEST/BLIZZ/SIMPLE:', blizzardKeys);
        
        // Test avec variables test
        // @ts-ignore
        const testVar1 = globalThis.Deno?.env?.get('TEST_VAR_1');
        // @ts-ignore
        const testVar2 = globalThis.Deno?.env?.get('TEST_VAR_2');
        // @ts-ignore
        const testSimple = globalThis.Deno?.env?.get('TEST_SIMPLE');
        console.log('🔧 [Debug] TEST_VAR_1 trouvé:', testVar1 || 'NON');
        console.log('🔧 [Debug] TEST_VAR_2 trouvé:', testVar2 || 'NON');
        console.log('🔧 [Debug] TEST_SIMPLE trouvé:', testSimple || 'NON');
        
        // Test avec d'autres variables qui fonctionnent
        // @ts-ignore
        const testToken = globalThis.Deno?.env?.get('TOKEN');
        // @ts-ignore
        const testBlagues = globalThis.Deno?.env?.get('BLAGUES_API_TOKEN');
        
        console.log('🔧 [Debug] TOKEN trouvé:', testToken ? 'OUI' : 'NON');
        console.log('🔧 [Debug] BLAGUES_API_TOKEN trouvé:', testBlagues ? 'OUI' : 'NON');
    }
    
    // WORKAROUND temporaire : Utiliser une variable qui fonctionne
    // Format: "CLIENT_ID:CLIENT_SECRET"
    // @ts-ignore
    const blizzardCombined = globalThis.Deno?.env?.get('BLIZZARD_COMBINED');
    
    if (blizzardCombined && blizzardCombined.includes(':')) {
        const [clientId, clientSecret] = blizzardCombined.split(':');
        if (clientId && clientSecret) {
            console.log('✅ [Config] Variables trouvées via BLIZZARD_COMBINED');
            return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
        }
    }
    
    // Variables d'environnement Blizzard - Test avec noms alternatifs
    // @ts-ignore - Deno global est disponible à l'exécution
    const envClientId = globalThis.Deno?.env?.get('BLIZZ_ID') || globalThis.Deno?.env?.get('BLIZZARD_CLIENT_ID');
    // @ts-ignore - Deno global est disponible à l'exécution  
    const envClientSecret = globalThis.Deno?.env?.get('BLIZZ_SECRET') || globalThis.Deno?.env?.get('BLIZZARD_CLIENT_SECRET');
    
    console.log('🔧 [Debug] BLIZZ_ID brut:', globalThis.Deno?.env?.get('BLIZZ_ID'));
    console.log('🔧 [Debug] BLIZZ_SECRET brut:', globalThis.Deno?.env?.get('BLIZZ_SECRET'));
    console.log('🔧 [Debug] BLIZZARD_CLIENT_ID brut:', globalThis.Deno?.env?.get('BLIZZARD_CLIENT_ID'));
    console.log('🔧 [Debug] BLIZZARD_CLIENT_SECRET brut:', globalThis.Deno?.env?.get('BLIZZARD_CLIENT_SECRET'));
    
    if (envClientId && envClientSecret) {
        console.log('✅ [Config] Variables d\'environnement trouvées');
        return { clientId: envClientId, clientSecret: envClientSecret };
    }
    
    console.log('❌ [Config] Variables BLIZZARD_CLIENT_ID et BLIZZARD_CLIENT_SECRET non trouvées');
    console.log('💡 [Config] Vérifiez votre configuration Dokploy ou les variables seront ignorées');
    return { clientId: null, clientSecret: null };
}
