// Configuration pour les APIs externes WoW
import { encodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { getBlizzardCredentials } from "./blizzardConfig.ts";

// Fonction intelligente pour normaliser un nom de royaume
// Cette fonction essaie différentes transformations pour trouver le bon slug
function normalizeRealmName(realmName: string): string[] {
    const input = realmName.toLowerCase().trim();
    const variations: string[] = [];
    
    // 1. Version originale nettoyée
    variations.push(input.replace(/['\s]/g, '-').replace(/[^a-z0-9-]/g, ''));
    
    // 2. Sans espaces ni apostrophes
    variations.push(input.replace(/['\s]/g, ''));
    
    // 3. Avec tirets pour les espaces
    variations.push(input.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    
    // 4. Cas spéciaux connus - SERVEURS FRANÇAIS EN PRIORITÉ
    const commonMappings: Record<string, string> = {
        // === SERVEURS FRANÇAIS POPULAIRES ===
        'kirintor': 'kirin-tor',
        'kirin tor': 'kirin-tor',
        'kirin-tor': 'kirin-tor',
        'hyjal': 'hyjal',
        'dalaran': 'dalaran',
        'elune': 'elune',
        'culte de la rive noire': 'culte-de-la-rive-noire',
        'cultedelarivenoire': 'culte-de-la-rive-noire',
        'ysondre': 'ysondre',
        'archimonde': 'archimonde',
        'illidan': 'illidan',
        'confrérie du thorium': 'confrerie-du-thorium',
        'confrerie du thorium': 'confrerie-du-thorium',
        'confrérieduthorium': 'confrerie-du-thorium',
        'confrerieduthorium': 'confrerie-du-thorium',
        'cho\'gall': 'chogall',
        'chogall': 'chogall',
        'sargeras': 'sargeras',
        'varimathras': 'varimathras',
        'eldre\'thalas': 'eldrethalas',
        'eldrethalas': 'eldrethalas',
        'conseil des ombres': 'conseil-des-ombres',
        'conseildesombres': 'conseil-des-ombres',
        'sinstralis': 'sinstralis',
        'rashgarroth': 'rashgarroth',
        'mal\'ganis': 'malganis',
        'malganis': 'malganis',
        'ner\'zhul': 'nerzhul',
        'nerzhul': 'nerzhul',
        'throk\'tar': 'throktar',
        'throktar': 'throktar',
        'drek\'thar': 'drekthar',
        'drekthar': 'drekthar',
        'krasus': 'krasus',
        'medivh': 'medivh',
        'suramar': 'suramar',
        'les clairvoyants': 'les-clairvoyants',
        'lesclairvoyants': 'les-clairvoyants',
        'les sentinelles': 'les-sentinelles',
        'lessentinelles': 'les-sentinelles',
        'marécage de zangar': 'marecage-de-zangar',
        'marecagedezangar': 'marecage-de-zangar',
        'temple noir': 'temple-noir',
        'templenoir': 'temple-noir',
        'la croisade écarlate': 'la-croisade-ecarlate',
        'lacroisadeecarlate': 'la-croisade-ecarlate',
        'fordragon': 'fordragon',
        'kael\'thas': 'kaelthas',
        'kaelthas': 'kaelthas',
        'garona': 'garona',
        'vol\'jin': 'voljin',
        'voljin': 'voljin',
        
        // === SERVEURS ANGLAIS POPULAIRES ===
        'tarren mill': 'tarren-mill',
        'tarrenmill': 'tarren-mill',
        'silvermoon': 'silvermoon',
        'outland': 'outland',
        'kazzak': 'kazzak',
        'twisting nether': 'twisting-nether',
        'twistingnether': 'twisting-nether',
        'ragnaros': 'ragnaros',
        'draenor': 'draenor',
        'burning legion': 'burning-legion',
        'burninglegion': 'burning-legion',
        'stormscale': 'stormscale',
        'frostmourne': 'frostmourne',
        'chamber of aspects': 'chamber-of-aspects',
        'chamberofaspects': 'chamber-of-aspects',
        'sylvanas': 'sylvanas',
        'ravencrest': 'ravencrest',
        'doomhammer': 'doomhammer',
        'defias brotherhood': 'defias-brotherhood',
        'defiasbrotherhood': 'defias-brotherhood',
        'the maelstrom': 'the-maelstrom',
        'themaelstrom': 'the-maelstrom',
        'earthen ring': 'earthen-ring',
        'earthenring': 'earthen-ring',
        'area 52': 'area-52',
        'area52': 'area-52',
        'kil\'jaeden': 'kiljaeden',
        'kiljaeden': 'kiljaeden',
        'kel\'thuzad': 'kelthuzad',
        'kelthuzad': 'kelthuzad',
        'blade\'s edge': 'blades-edge',
        'bladesedge': 'blades-edge',
        'lightning\'s blade': 'lightnings-blade',
        'lightningsblade': 'lightnings-blade',
        'shattered hand': 'shattered-hand',
        'shatteredhand': 'shattered-hand',
        'shattered halls': 'shattered-halls',
        'shatteredhalls': 'shattered-halls',
        
        // === SERVEURS ALLEMANDS ===
        'antonidas': 'antonidas',
        'blackhand': 'blackhand',
        'blackmoore': 'blackmoore',
        'blackrock': 'blackrock',
        'destromath': 'destromath',
        'die aldor': 'die-aldor',
        'diealdor': 'die-aldor',
        'eredar': 'eredar',
        'frostwolf': 'frostwolf',
        'gilneas': 'gilneas',
        'lothar': 'lothar',
        'malfurion': 'malfurion',
        'mannoroth': 'mannoroth',
        'nathrezim': 'nathrezim',
        'norgannon': 'norgannon',
        'thrall': 'thrall',
        'tirion': 'tirion'
    };
    
    if (commonMappings[input]) {
        variations.unshift(commonMappings[input]); // Mettre en premier
    }
    
    // Supprimer les doublons
    return [...new Set(variations)];
}

export const WOW_API_CONFIG = {
    // Raider.IO - Gratuit, pas de clé nécessaire
    RAIDER_IO: {
        BASE_URL: 'https://raider.io/api/v1',
        ENDPOINTS: {
            GUILD_PROFILE: '/guilds/profile',
            CHARACTER_PROFILE: '/characters/profile'
        }
    },
    
    // API Blizzard Battle.net - Nécessite une clé API
    // Pour obtenir une clé: https://develop.battle.net/
    BLIZZARD: {
        BASE_URL: 'https://eu.api.blizzard.com',
        // Variables lues dynamiquement dans les fonctions
        ENDPOINTS: {
            // Profile APIs - utilisent le namespace profile-{region}
            GUILD_PROFILE: '/profile/wow/guild/{realmSlug}/{nameSlug}',
            GUILD_ROSTER: '/profile/wow/guild/{realmSlug}/{nameSlug}/roster',
            GUILD_ACHIEVEMENTS: '/profile/wow/guild/{realmSlug}/{nameSlug}/achievements',
            // Game Data APIs - utilisent le namespace dynamic-{region}
            GUILD_SEARCH: '/data/wow/search/guild',
            CONNECTED_REALMS: '/data/wow/connected-realm/index',
            REALM_INDEX: '/data/wow/realm/index'
        }
    },
    
    // WarcraftLogs - Pour les logs de combat détaillés
    // API: https://www.warcraftlogs.com/api/docs
    WARCRAFTLOGS: {
        BASE_URL: 'https://www.warcraftlogs.com/v1',
        // Variable lue dynamiquement
        ENDPOINTS: {
            REPORTS: '/reports/guild',
            RANKINGS: '/rankings/guild'
        }
    },
    
    // WoWProgress - Pas d'API officielle, données limitées
    WOWPROGRESS: {
        BASE_URL: 'https://www.wowprogress.com',
        ENDPOINTS: {
            GUILD_RANK: '/guild'
        }
    }
};

// Interface pour les réponses combinées
export interface EnhancedGuildData {
    // Données de base (Raider.IO)
    name: string;
    realm: string;
    region: string;
    raid_progression: Record<string, unknown>;
    raid_rankings: Record<string, unknown>;
    
    // Données étendues (Blizzard API si disponible)
    member_count?: number;
    faction?: string;
    achievement_points?: number;
    created_timestamp?: number;
    
    // Données de performance (WarcraftLogs si disponible)
    recent_reports?: unknown[];
    performance_rankings?: unknown;
    
    // Métadonnées
    data_sources: string[];
    last_updated: Date;
}

// Interface pour les réponses des royaumes
interface RealmInfo {
    name: string;
    slug: string;
}

// Fonctions utilitaires pour les appels API
export class WoWAPIClient {
    private blizzardToken: string | null = null;
    private tokenExpiry: number = 0;

    async getBlizzardToken(): Promise<string | null> {
        console.log('🔑 [Blizzard API] Récupération des credentials...');
        
        // Utiliser la fonction centralisée pour récupérer les credentials
        const { clientId, clientSecret } = getBlizzardCredentials();
        
        console.log('🔍 [Blizzard API] Credentials trouvés:', {
            clientId: clientId ? `${clientId.substring(0, 8)}...` : 'NON TROUVÉ',
            clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : 'NON TROUVÉ'
        });
        
        if (!clientId || !clientSecret) {
            console.log('❌ [Blizzard API] Credentials manquants - utilisation de Raider.IO seulement');
            return null;
        }

        console.log('✅ [Blizzard API] Credentials trouvés');

        // Vérifier si le token est encore valide
        if (this.blizzardToken && Date.now() < this.tokenExpiry) {
            console.log('♻️ [Blizzard API] Réutilisation du token existant');
            return this.blizzardToken;
        }

        console.log('🔄 [Blizzard API] Demande d\'un nouveau token...');

        try {
            const credentials = `${clientId}:${clientSecret}`;
            // Utiliser l'utilitaire d'encodage base64 de Deno
            const base64String = encodeBase64(credentials);
            
            const response = await fetch('https://oauth.battle.net/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${base64String}`
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                console.log(`❌ [Blizzard API] Erreur authentification: ${response.status} ${response.statusText}`);
                throw new Error('Failed to get Blizzard token');
            }

            const data = await response.json();
            this.blizzardToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // -1 minute de sécurité

            console.log(`✅ [Blizzard API] Token obtenu avec succès (expire dans ${Math.round(data.expires_in / 3600)}h)`);
            return this.blizzardToken;
        } catch (error) {
            console.error('❌ [Blizzard API] Erreur lors de l\'obtention du token:', error);
            return null;
        }
    }

    /**
     * APPROCHE CORRIGÉE basée sur la documentation officielle Blizzard
     * Profile APIs: Les guildes utilisent /profile/wow/guild avec namespace profile-{region}
     * Game Data APIs: La recherche utilise /data/wow/search/guild avec namespace dynamic-{region}
     */
    async getGuildFromBlizzard(region: string, realm: string, guild: string): Promise<Record<string, unknown> | null> {
        console.log(`🏰 [Blizzard API] Récupération guilde: ${guild} (${realm}, ${region})`);
        console.log(`📚 [Blizzard API] Utilisation des endpoints corrects selon la documentation officielle`);
        
        const token = await this.getBlizzardToken();
        if (!token) {
            console.log('❌ [Blizzard API] Pas de token disponible');
            return null;
        }

        try {
            // Normaliser le nom du royaume - obtenir toutes les variations
            const realmVariations = normalizeRealmName(realm);
            console.log(`🔧 [Blizzard API] Royaume normalisé: '${realm}' → ${realmVariations.length} variations: ${realmVariations.join(', ')}`);
            
            // Encoder les paramètres URL
            const encodedGuild = encodeURIComponent(guild.toLowerCase().replace(/\s+/g, '-'));
            
            // MÉTHODE 1: Profile API directe (endpoint correct)
            console.log(`🎯 [Blizzard API] Méthode 1: Profile API directe avec namespace profile-${region}`);
            for (const realmVariation of realmVariations) {
                const encodedRealm = encodeURIComponent(realmVariation);
                // URL corrigée selon la documentation: /profile/wow/guild/{realmSlug}/{nameSlug}
                const profileUrl = `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.GUILD_PROFILE.replace('{realmSlug}', encodedRealm).replace('{nameSlug}', encodedGuild)}?namespace=profile-${region}&locale=fr_FR&access_token=${token}`;
                console.log(`🌐 [Blizzard API] Test Profile API avec '${realmVariation}': ${profileUrl}`);
                
                try {
                    const profileResponse = await fetch(profileUrl);
                    console.log(`📡 [Blizzard API] Réponse Profile API pour '${realmVariation}': ${profileResponse.status}`);
                    
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        console.log(`✅ [Blizzard API] Guilde trouvée via Profile API avec variation '${realmVariation}'`);
                        return profileData as Record<string, unknown>;
                    } else if (profileResponse.status === 404) {
                        console.log(`⚠️ [Blizzard API] Guilde non trouvée avec '${realmVariation}' (404)`);
                    } else {
                        console.log(`⚠️ [Blizzard API] Erreur ${profileResponse.status} avec '${realmVariation}'`);
                    }
                } catch (error) {
                    console.log(`⚠️ [Blizzard API] Erreur Profile API avec '${realmVariation}':`, error instanceof Error ? error.message : error);
                }
            }
            
            console.log(`⚠️ [Blizzard API] Profile API direct a échoué, essai avec l'API de recherche`);
            
            // MÉTHODE 2: API de recherche (namespace dynamic)
            console.log(`🔍 [Blizzard API] Méthode 2: API de recherche avec namespace dynamic-${region}`);
            
            // Essayer avec toutes les variations de realm pour la recherche
            for (const realmVariation of realmVariations) {
                const encodedRealmVariation = encodeURIComponent(realmVariation);
                // Format correct pour la recherche de guilde avec namespace dynamic
                const searchUrl = `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.GUILD_SEARCH}?namespace=dynamic-${region}&locale=fr_FR&access_token=${token}&name=${encodedGuild}&realm=${encodedRealmVariation}`;
                console.log(`🌐 [Blizzard API] URL recherche avec '${realmVariation}': ${searchUrl}`);
                
                try {
                    const searchResponse = await fetch(searchUrl);
                    console.log(`📡 [Blizzard API] Réponse recherche avec '${realmVariation}': ${searchResponse.status}`);
                    
                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        console.log(`✅ [Blizzard API] Recherche réussie avec '${realmVariation}':`, {
                            totalResults: searchData.page?.totalResults || 0,
                            results: searchData.results?.length || 0
                        });
                        
                        if (searchData.results && searchData.results.length > 0) {
                            const guildResult = searchData.results[0];
                            console.log(`🏰 [Blizzard API] Guilde trouvée via recherche:`, {
                                name: guildResult.data?.name,
                                realm: guildResult.data?.realm?.name
                            });
                            
                            // Récupérer les détails complets via l'URL fournie
                            if (guildResult.data?.href) {
                                const detailUrl = `${guildResult.data.href}?locale=fr_FR&access_token=${token}`;
                                console.log(`📊 [Blizzard API] Récupération détails: ${detailUrl}`);
                                
                                try {
                                    const detailResponse = await fetch(detailUrl);
                                    if (detailResponse.ok) {
                                        const detailData = await detailResponse.json();
                                        console.log(`✅ [Blizzard API] Détails complets récupérés via API de recherche`);
                                        return detailData;
                                    }
                                } catch (detailError) {
                                    console.log(`⚠️ [Blizzard API] Erreur récupération détails:`, detailError instanceof Error ? detailError.message : detailError);
                                }
                            }
                            
                            // Si pas d'URL de détails, retourner les données de la recherche
                            console.log(`✅ [Blizzard API] Retour des données de base de la recherche`);
                            return guildResult.data;
                        }
                    } else {
                        console.log(`⚠️ [Blizzard API] Échec recherche avec '${realmVariation}' (${searchResponse.status})`);
                    }
                } catch (error) {
                    console.log(`⚠️ [Blizzard API] Erreur recherche avec '${realmVariation}':`, error instanceof Error ? error.message : error);
                }
            }
            
            console.log(`⚠️ [Blizzard API] API de recherche a échoué, essai avec Connected Realms`);
            
            // MÉTHODE 3: Connected Realms (pour trouver le bon slug de royaume)
            console.log(`🔄 [Blizzard API] Méthode 3: Connected Realms avec namespace dynamic-${region}`);
            const connectedRealmsUrl = `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.CONNECTED_REALMS}?namespace=dynamic-${region}&locale=fr_FR&access_token=${token}`;
            console.log(`🌐 [Blizzard API] URL Connected Realms: ${connectedRealmsUrl}`);
            
            try {
                const connectedRealmsResponse = await fetch(connectedRealmsUrl);
                console.log(`📡 [Blizzard API] Réponse Connected Realms: ${connectedRealmsResponse.status}`);
                
                if (connectedRealmsResponse.ok) {
                    const connectedRealmsData = await connectedRealmsResponse.json();
                    console.log(`📊 [Blizzard API] ${connectedRealmsData.connected_realms?.length || 0} Connected Realms trouvés`);
                    
                    // Chercher dans les Connected Realms (limiter à 5 pour éviter trop d'appels)
                    if (connectedRealmsData.connected_realms) {
                        for (const connectedRealm of connectedRealmsData.connected_realms.slice(0, 5)) {
                            try {
                                const detailUrl = `${connectedRealm.href}?locale=fr_FR&access_token=${token}`;
                                console.log(`🔍 [Blizzard API] Vérification Connected Realm: ${detailUrl}`);
                                
                                const detailResponse = await fetch(detailUrl);
                                if (detailResponse.ok) {
                                    const detailData = await detailResponse.json();
                                    
                                    // Vérifier si notre royaume est dans ce connected realm
                                    const foundRealm = detailData.realms?.find((r: RealmInfo) => 
                                        r.name?.toLowerCase() === realm.toLowerCase() ||
                                        r.slug?.toLowerCase() === realm.toLowerCase() ||
                                        r.name?.toLowerCase().includes(realm.toLowerCase()) ||
                                        r.slug?.toLowerCase().includes(realm.toLowerCase()) ||
                                        realmVariations.some(variation => 
                                            r.slug?.toLowerCase() === variation.toLowerCase() ||
                                            r.name?.toLowerCase() === variation.toLowerCase()
                                        )
                                    );
                                    
                                    if (foundRealm) {
                                        console.log(`✅ [Blizzard API] Royaume trouvé dans Connected Realm:`, {
                                            realmName: foundRealm.name,
                                            realmSlug: foundRealm.slug,
                                            connectedRealmId: detailData.id
                                        });
                                        
                                        // Essayer de récupérer la guilde avec le bon slug via Profile API
                                        const guildProfileUrl = `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.GUILD_PROFILE.replace('{realmSlug}', foundRealm.slug).replace('{nameSlug}', encodedGuild)}?namespace=profile-${region}&locale=fr_FR&access_token=${token}`;
                                        console.log(`🏰 [Blizzard API] Appel Profile API avec slug correct: ${guildProfileUrl}`);
                                        
                                        try {
                                            const guildResponse = await fetch(guildProfileUrl);
                                            if (guildResponse.ok) {
                                                const guildData = await guildResponse.json();
                                                console.log(`✅ [Blizzard API] Guilde trouvée via Connected Realm + Profile API`);
                                                return guildData;
                                            } else {
                                                console.log(`❌ [Blizzard API] Guilde '${guild}' non trouvée sur '${foundRealm.name}' (${guildResponse.status})`);
                                            }
                                        } catch (guildError) {
                                            console.log(`⚠️ [Blizzard API] Erreur récupération guilde:`, guildError instanceof Error ? guildError.message : guildError);
                                        }
                                    }
                                }
                            } catch (realmError) {
                                // Continuer avec le prochain Connected Realm
                                console.log(`⚠️ [Blizzard API] Erreur sur un Connected Realm, passage au suivant:`, realmError instanceof Error ? realmError.message : realmError);
                            }
                        }
                    }
                    console.log(`❌ [Blizzard API] Royaume '${realm}' non trouvé dans les Connected Realms testés`);
                } else {
                    console.log(`❌ [Blizzard API] Erreur Connected Realms: ${connectedRealmsResponse.status}`);
                }
            } catch (connectedError) {
                console.log(`❌ [Blizzard API] Erreur lors de la récupération des Connected Realms:`, connectedError instanceof Error ? connectedError.message : connectedError);
            }
            
            // Si toutes les méthodes échouent
            console.log(`❌ [Blizzard API] Toutes les méthodes ont échoué`);
            console.log(`💡 [Blizzard API] Suggestions de debug:`);
            console.log(`   - Vérifiez que la guilde '${guild}' existe sur le royaume '${realm}'`);
            console.log(`   - Vérifiez que la guilde est publique (pas privée)`);
            console.log(`   - Testez avec une guilde connue comme "Method" sur "Tarren Mill"`);
            console.log(`   - Utilisez les noms de royaumes en anglais si possible (ex: "Kirin Tor" → "kirin-tor")`);
            return null;

        } catch (error) {
            console.error('❌ [Blizzard API] Erreur lors de la récupération:', error);
            return null;
        }
    }

    async getEnhancedGuildData(region: string, realm: string, guild: string): Promise<EnhancedGuildData | null> {
        console.log(`📊 [WoW API] Début récupération données pour: ${guild} (${realm}, ${region})`);
        console.log(`🔄 [WoW API] NOUVEAU: Priorité à l'API Blizzard, puis Raider.IO en fallback`);
        const dataSources: string[] = [];
        
        let primaryData: Record<string, unknown> | null = null;
        let blizzardData: Record<string, unknown> | null = null;
        
        // 1. PRIORITÉ: Essayer d'abord l'API Blizzard
        console.log('🔍 [Blizzard API] Tentative récupération données principales...');
        blizzardData = await this.getGuildFromBlizzard(region, realm, guild);
        
        if (blizzardData) {
            console.log('✅ [Blizzard API] Données principales récupérées via Blizzard');
            primaryData = blizzardData;
            dataSources.push('Blizzard API');
            
            // Si Blizzard fonctionne, on essaie quand même de récupérer les données de progression depuis Raider.IO
            console.log('🔍 [Raider.IO] Récupération données de progression complémentaires...');
            try {
                // Utiliser les variations normalisées pour Raider.IO aussi
                const realmVariations = normalizeRealmName(realm);
                const encodedGuild = encodeURIComponent(guild);
                
                let raiderData = null;
                for (const realmVariation of realmVariations) {
                    const encodedRealm = encodeURIComponent(realmVariation);
                    const raiderResponse = await fetch(
                        `${WOW_API_CONFIG.RAIDER_IO.BASE_URL}${WOW_API_CONFIG.RAIDER_IO.ENDPOINTS.GUILD_PROFILE}?region=${region}&realm=${encodedRealm}&name=${encodedGuild}&fields=raid_progression,raid_rankings,mythic_plus_ranks`
                    );

                    if (raiderResponse.ok) {
                        raiderData = await raiderResponse.json();
                        console.log(`✅ [Raider.IO] Données de progression ajoutées en complément avec variation '${realmVariation}'`);
                        dataSources.push('Raider.IO (progression)');
                        break;
                    }
                }
                
                if (raiderData) {
                    // Fusionner les données de progression de Raider.IO avec les données Blizzard
                    primaryData = {
                        ...primaryData,
                        raid_progression: raiderData.raid_progression,
                        raid_rankings: raiderData.raid_rankings
                    };
                } else {
                    console.log('⚠️ [Raider.IO] Pas de données de progression disponibles');
                }
            } catch (raiderError) {
                console.log('⚠️ [Raider.IO] Erreur lors de la récupération des données de progression:', raiderError instanceof Error ? raiderError.message : raiderError);
            }
        } else {
            // 2. FALLBACK: Si Blizzard échoue, utiliser Raider.IO comme source principale
            console.log('🔄 [Fallback] Blizzard indisponible, utilisation de Raider.IO comme source principale');
            
            try {
                // Utiliser les variations normalisées pour Raider.IO
                const realmVariations = normalizeRealmName(realm);
                const encodedGuild = encodeURIComponent(guild);
                
                console.log('🔍 [Raider.IO] Récupération données principales avec variations...');
                
                let raiderData = null;
                let usedVariation = '';
                
                for (const realmVariation of realmVariations) {
                    const encodedRealm = encodeURIComponent(realmVariation);
                    console.log(`🌐 [Raider.IO] Test avec variation '${realmVariation}'`);
                    
                    const raiderResponse = await fetch(
                        `${WOW_API_CONFIG.RAIDER_IO.BASE_URL}${WOW_API_CONFIG.RAIDER_IO.ENDPOINTS.GUILD_PROFILE}?region=${region}&realm=${encodedRealm}&name=${encodedGuild}&fields=raid_progression,raid_rankings,mythic_plus_ranks`
                    );

                    if (raiderResponse.ok) {
                        raiderData = await raiderResponse.json();
                        usedVariation = realmVariation;
                        console.log(`✅ [Raider.IO] Données principales récupérées avec variation '${realmVariation}' pour: ${raiderData.name}`);
                        break;
                    } else {
                        console.log(`⚠️ [Raider.IO] Échec avec variation '${realmVariation}': ${raiderResponse.status}`);
                    }
                }

                if (!raiderData) {
                    console.log(`❌ [Raider.IO] Aucune variation n'a fonctionné`);
                    throw new Error('Guilde non trouvée sur Raider.IO avec toutes les variations');
                }

                primaryData = raiderData;
                dataSources.push(`Raider.IO (via ${usedVariation})`);
                
            } catch (error) {
                console.error('❌ [WoW API] Erreur lors de la récupération des données de guilde:', error);
                return null;
            }
        }

        if (!primaryData) {
            console.error('❌ [WoW API] Aucune source de données disponible');
            return null;
        }

        // 3. Construire la réponse combinée
        console.log('🔧 [WoW API] Construction des données finales...');
        const enhancedData: EnhancedGuildData = {
            name: (primaryData.name as string) || guild,
            realm: (primaryData.realm as { name?: string })?.name || (primaryData.realm as string) || realm,
            region: region,
            raid_progression: (primaryData.raid_progression as Record<string, unknown>) || {},
            raid_rankings: (primaryData.raid_rankings as Record<string, unknown>) || {},
            
            // Données Blizzard si disponibles
            member_count: blizzardData?.member_count as number,
            faction: (blizzardData?.faction as { name?: string })?.name,
            achievement_points: blizzardData?.achievement_points as number,
            created_timestamp: blizzardData?.created_timestamp as number,
            
            data_sources: dataSources,
            last_updated: new Date()
        };

        console.log(`✅ [WoW API] Données finales compilées avec sources: ${dataSources.join(', ')}`);
        return enhancedData;
    }

    // Fonction de test pour vérifier la configuration API Blizzard
    async testBlizzardConnection(): Promise<boolean> {
        try {
            const token = await this.getBlizzardToken();
            if (!token) {
                console.log('🔧 API Blizzard non configurée (variables d\'environnement manquantes)');
                return false;
            }

            // Test simple : récupérer les connected realms avec le bon namespace
            const response = await fetch(
                `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.CONNECTED_REALMS}?namespace=dynamic-eu&locale=fr_FR&access_token=${token}`
            );

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ API Blizzard opérationnelle (${data.connected_realms?.length || 0} Connected Realms disponibles)`);
                return true;
            } else {
                console.log(`❌ Erreur API Blizzard: ${response.status}`);
                return false;
            }
        } catch (error: unknown) {
            console.log(`❌ Erreur de connexion Blizzard: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
            return false;
        }
    }
}
