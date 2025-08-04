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
     * APPROCHE CORRIGÉE basée sur le SDK wow-api-sdk qui fonctionne
     * Utilisation exacte du même pattern que pour les characters
     * Pattern observé: /profile/wow/character/{realm}/{character}?namespace=profile-{region}
     * Pattern guilde: /profile/wow/guild/{realm}/{guild}?namespace=profile-{region}
     */
    async getGuildFromBlizzard(region: string, realm: string, guild: string): Promise<Record<string, unknown> | null> {
        console.log(`🏰 [Blizzard API] Récupération guilde: ${guild} (${realm}, ${region})`);
        console.log(`📚 [Blizzard API] Utilisation du pattern exact du SDK wow-api-sdk`);
        
        const token = await this.getBlizzardToken();
        if (!token) {
            console.log('❌ [Blizzard API] Pas de token disponible');
            return null;
        }

        try {
            // Normaliser exactement comme le SDK: seulement toLowerCase()
            const realmSlug = realm.toLowerCase().replace(/\s+/g, '-');
            const guildSlug = guild.toLowerCase().replace(/\s+/g, '-');
            
            console.log(`🔧 [Blizzard API] Normalisation simple: realm '${realm}' → '${realmSlug}', guild '${guild}' → '${guildSlug}'`);
            
            // Pattern exact du SDK pour les guildes
            const host = region === 'us' ? 'us.api.blizzard.com' : 
                        region === 'kr' ? 'kr.api.blizzard.com' :
                        region === 'tw' ? 'tw.api.blizzard.com' :
                        region === 'cn' ? 'gateway.battlenet.com.cn' :
                        'eu.api.blizzard.com'; // default EU
            
            const guildUrl = `https://${host}/profile/wow/guild/${realmSlug}/${guildSlug}?namespace=profile-${region}&locale=fr_FR&access_token=${token}`;
            console.log(`🌐 [Blizzard API] URL Profile API direct: ${guildUrl}`);
            
            try {
                const guildResponse = await fetch(guildUrl);
                console.log(`📡 [Blizzard API] Réponse Profile API: ${guildResponse.status}`);
                
                if (guildResponse.ok) {
                    const guildData = await guildResponse.json();
                    console.log(`✅ [Blizzard API] Guilde trouvée via Profile API direct`);
                    return guildData as Record<string, unknown>;
                } else if (guildResponse.status === 404) {
                    console.log(`⚠️ [Blizzard API] Guilde non trouvée (404) - essai avec variations`);
                } else {
                    console.log(`⚠️ [Blizzard API] Erreur ${guildResponse.status}: ${guildResponse.statusText}`);
                }
            } catch (error) {
                console.log(`⚠️ [Blizzard API] Erreur Profile API direct:`, error instanceof Error ? error.message : error);
            }
            
            // Si l'appel direct échoue, essayer avec les variations du realm
            console.log(`🔄 [Blizzard API] Essai avec variations de realm`);
            const realmVariations = normalizeRealmName(realm);
            console.log(`� [Blizzard API] ${realmVariations.length} variations: ${realmVariations.join(', ')}`);
            
            for (const realmVariation of realmVariations) {
                const variantUrl = `https://${host}/profile/wow/guild/${realmVariation}/${guildSlug}?namespace=profile-${region}&locale=fr_FR&access_token=${token}`;
                console.log(`� [Blizzard API] Test variation '${realmVariation}': ${variantUrl}`);
                
                try {
                    const variantResponse = await fetch(variantUrl);
                    console.log(`📡 [Blizzard API] Réponse pour '${realmVariation}': ${variantResponse.status}`);
                    
                    if (variantResponse.ok) {
                        const variantData = await variantResponse.json();
                        console.log(`✅ [Blizzard API] Guilde trouvée avec variation '${realmVariation}'`);
                        return variantData as Record<string, unknown>;
                    }
                } catch (error) {
                    console.log(`⚠️ [Blizzard API] Erreur avec variation '${realmVariation}':`, error instanceof Error ? error.message : error);
                }
            }
            
            // Si toutes les tentatives échouent
            console.log(`❌ [Blizzard API] Toutes les tentatives ont échoué`);
            console.log(`💡 [Blizzard API] Debug suggestions:`);
            console.log(`   - Vérifiez que la guilde '${guild}' existe sur '${realm}'`);
            console.log(`   - Vérifiez que la guilde est publique`);
            console.log(`   - URL testée: https://${host}/profile/wow/guild/${realmSlug}/${guildSlug}`);
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
