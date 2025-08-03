// Configuration API Blizzard - Alternative si variables d'environnement ne fonctionnent pas
export const BLIZZARD_CONFIG = {
    // Fallback - REMPLACEZ par vos vraies clés ou utilisez les variables d'environnement
    CLIENT_ID: 'your_client_id_here',
    CLIENT_SECRET: 'your_client_secret_here',
};

// Fonction pour récupérer les credentials Blizzard
export function getBlizzardCredentials() {
    console.log('🔍 [Config] Recherche des credentials Blizzard...');
    
    // Priorité 1: Variables d'environnement (RECOMMANDÉ pour la production)
    try {
        // @ts-ignore - Deno global est disponible à l'exécution
        if (typeof globalThis.Deno !== 'undefined') {
            // @ts-ignore
            const envClientId = globalThis.Deno.env.get('BLIZZARD_CLIENT_ID');
            // @ts-ignore
            const envClientSecret = globalThis.Deno.env.get('BLIZZARD_CLIENT_SECRET');
            
            if (envClientId && envClientSecret) {
                console.log('✅ [Config] Variables d\'environnement trouvées');
                return { clientId: envClientId, clientSecret: envClientSecret };
            }
        }
    } catch (error) {
        console.log('⚠️ [Config] Erreur lors de la lecture des variables d\'environnement:', error);
    }
    
    // Priorité 2: Configuration hardcodée (POUR DÉVELOPPEMENT SEULEMENT)
    // ⚠️ ATTENTION: Ne jamais mettre de vraies clés dans un repo public
    console.log('⚠️ [Config] Variables d\'environnement non trouvées - Vérifiez votre configuration Dokploy');
    
    if (BLIZZARD_CONFIG.CLIENT_ID === 'your_client_id_here' || 
        BLIZZARD_CONFIG.CLIENT_SECRET === 'your_client_secret_here') {
        console.log('❌ [Config] Clés par défaut détectées - Configuration requise');
        return { clientId: null, clientSecret: null };
    }
    
    return { 
        clientId: BLIZZARD_CONFIG.CLIENT_ID, 
        clientSecret: BLIZZARD_CONFIG.CLIENT_SECRET 
    };
}
