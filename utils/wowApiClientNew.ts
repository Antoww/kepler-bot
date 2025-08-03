// Configuration pour les APIs externes WoW
import { encodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { getBlizzardCredentials } from "./blizzardConfig.ts";

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
            GUILD: '/data/wow/guild',
            GUILD_ROSTER: '/data/wow/guild/roster',
            GUILD_ACHIEVEMENTS: '/data/wow/guild/achievements',
            GUILD_SEARCH: '/data/wow/search/guild',
            CONNECTED_REALMS: '/data/wow/connected-realm/index'
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
    raid_progression: Record<string, any>;
    raid_rankings: Record<string, any>;
    
    // Données étendues (Blizzard API si disponible)
    member_count?: number;
    faction?: string;
    achievement_points?: number;
    created_timestamp?: number;
    
    // Données de performance (WarcraftLogs si disponible)
    recent_reports?: any[];
    performance_rankings?: any;
    
    // Métadonnées
    data_sources: string[];
    last_updated: Date;
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
     * NOUVELLE APPROCHE basée sur la recherche de documentation Blizzard
     * Utilise les méthodes modernes : API de recherche + Connected Realms
     */
    async getGuildFromBlizzard(region: string, realm: string, guild: string): Promise<any | null> {
        console.log(`🏰 [Blizzard API] Récupération guilde: ${guild} (${realm}, ${region})`);
        console.log(`📚 [Blizzard API] Utilisation de la nouvelle approche basée sur mes recherches`);
        
        const token = await this.getBlizzardToken();
        if (!token) {
            console.log('❌ [Blizzard API] Pas de token disponible');
            return null;
        }

        try {
            // Encoder les paramètres URL
            const encodedRealm = encodeURIComponent(realm);
            const encodedGuild = encodeURIComponent(guild);
            
            // MÉTHODE 1: API de recherche de guildes (recommandée par la documentation)
            console.log(`🔍 [Blizzard API] Méthode 1: API de recherche de guildes`);
            const searchUrl = `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.GUILD_SEARCH}?namespace=profile-${region}&locale=fr_FR&access_token=${token}&name.fr_FR=${encodedGuild}&realm=${encodedRealm}`;
            console.log(`🌐 [Blizzard API] URL recherche: ${searchUrl}`);
            
            const searchResponse = await fetch(searchUrl);
            console.log(`📡 [Blizzard API] Réponse recherche: ${searchResponse.status}`);
            
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                console.log(`✅ [Blizzard API] Recherche réussie:`, {
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
                        
                        const detailResponse = await fetch(detailUrl);
                        if (detailResponse.ok) {
                            const detailData = await detailResponse.json();
                            console.log(`✅ [Blizzard API] Détails complets récupérés via API de recherche`);
                            return detailData;
                        }
                    }
                    
                    // Si pas d'URL de détails, retourner les données de la recherche
                    return guildResult.data;
                } else {
                    console.log(`⚠️ [Blizzard API] Aucun résultat trouvé via l'API de recherche`);
                }
            } else {
                console.log(`⚠️ [Blizzard API] Échec API de recherche (${searchResponse.status}), passage aux Connected Realms`);
            }
            
            // MÉTHODE 2: Connected Realms (structure moderne de WoW)
            console.log(`🔄 [Blizzard API] Méthode 2: Connected Realms`);
            const connectedRealmsUrl = `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.CONNECTED_REALMS}?namespace=dynamic-${region}&locale=fr_FR&access_token=${token}`;
            console.log(`🌐 [Blizzard API] URL Connected Realms: ${connectedRealmsUrl}`);
            
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
                                const foundRealm = detailData.realms?.find((r: any) => 
                                    r.name?.toLowerCase() === realm.toLowerCase() ||
                                    r.slug?.toLowerCase() === realm.toLowerCase() ||
                                    r.name?.toLowerCase().includes(realm.toLowerCase()) ||
                                    r.slug?.toLowerCase().includes(realm.toLowerCase())
                                );
                                
                                if (foundRealm) {
                                    console.log(`✅ [Blizzard API] Royaume trouvé dans Connected Realm:`, {
                                        realmName: foundRealm.name,
                                        realmSlug: foundRealm.slug,
                                        connectedRealmId: detailData.id
                                    });
                                    
                                    // Essayer de récupérer la guilde avec le bon slug
                                    const guildUrl = `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.GUILD}/${foundRealm.slug}/${encodedGuild}?namespace=profile-${region}&locale=fr_FR&access_token=${token}`;
                                    console.log(`🏰 [Blizzard API] Appel guilde avec slug correct: ${guildUrl}`);
                                    
                                    const guildResponse = await fetch(guildUrl);
                                    if (guildResponse.ok) {
                                        const guildData = await guildResponse.json();
                                        console.log(`✅ [Blizzard API] Guilde trouvée via Connected Realm`);
                                        return guildData;
                                    } else {
                                        console.log(`❌ [Blizzard API] Guilde '${guild}' non trouvée sur '${foundRealm.name}' (${guildResponse.status})`);
                                    }
                                }
                            }
                        } catch (e) {
                            // Continuer avec le prochain Connected Realm
                            console.log(`⚠️ [Blizzard API] Erreur sur un Connected Realm, passage au suivant`);
                        }
                    }
                }
                console.log(`❌ [Blizzard API] Royaume '${realm}' non trouvé dans les Connected Realms testés`);
            } else {
                console.log(`❌ [Blizzard API] Erreur Connected Realms: ${connectedRealmsResponse.status}`);
            }
            
            // MÉTHODE 3: Fallback avec transformation de slug (ancien système)
            console.log(`🔄 [Blizzard API] Méthode 3: Fallback avec slug transformé`);
            const realmSlug = realm.toLowerCase().replace(/['\s]/g, '');
            const encodedRealmSlug = encodeURIComponent(realmSlug);
            console.log(`🔧 [Blizzard API] Transformation: '${realm}' → '${realmSlug}'`);
            
            const directUrl = `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.GUILD}/${encodedRealmSlug}/${encodedGuild}?namespace=profile-${region}&locale=fr_FR&access_token=${token}`;
            console.log(`🎯 [Blizzard API] Essai direct: ${directUrl}`);
            
            const directResponse = await fetch(directUrl);
            if (directResponse.ok) {
                const directData = await directResponse.json();
                console.log(`✅ [Blizzard API] Guilde trouvée via essai direct (fallback)`);
                return directData;
            }
            
            // Si toutes les méthodes échouent
            console.log(`❌ [Blizzard API] Toutes les méthodes ont échoué`);
            console.log(`💡 [Blizzard API] Suggestions de debug:`);
            console.log(`   - Vérifiez que la guilde '${guild}' existe sur le royaume '${realm}'`);
            console.log(`   - Essayez avec le nom de royaume complet (ex: "Kirin Tor" au lieu de "kirin-tor")`);
            console.log(`   - Vérifiez sur le site officiel WoW que la guilde est bien visible publiquement`);
            console.log(`   - Testez d'abord avec une guilde connue comme "Method" sur "Tarren Mill"`);
            return null;

        } catch (error) {
            console.error('❌ [Blizzard API] Erreur lors de la récupération:', error);
            return null;
        }
    }

    async getEnhancedGuildData(region: string, realm: string, guild: string): Promise<EnhancedGuildData | null> {
        console.log(`📊 [WoW API] Début récupération données pour: ${guild} (${realm}, ${region})`);
        const dataSources: string[] = [];
        
        // 1. Données principales de Raider.IO
        const encodedGuild = encodeURIComponent(guild);
        const encodedRealm = encodeURIComponent(realm);
        
        try {
            console.log('🔍 [Raider.IO] Récupération données principales...');
            const raiderResponse = await fetch(
                `${WOW_API_CONFIG.RAIDER_IO.BASE_URL}${WOW_API_CONFIG.RAIDER_IO.ENDPOINTS.GUILD_PROFILE}?region=${region}&realm=${encodedRealm}&name=${encodedGuild}&fields=raid_progression,raid_rankings,mythic_plus_ranks`
            );

            if (!raiderResponse.ok) {
                console.log(`❌ [Raider.IO] Erreur ${raiderResponse.status}: ${raiderResponse.statusText}`);
                throw new Error('Guilde non trouvée sur Raider.IO');
            }

            const raiderData = await raiderResponse.json();
            console.log(`✅ [Raider.IO] Données récupérées pour: ${raiderData.name}`);
            dataSources.push('Raider.IO');

            // 2. Données supplémentaires de Blizzard (si configuré)
            console.log('🔍 [Blizzard API] Tentative récupération données supplémentaires...');
            const blizzardData = await this.getGuildFromBlizzard(region, realm, guild);
            if (blizzardData) {
                console.log('✅ [Blizzard API] Données supplémentaires ajoutées');
                dataSources.push('Blizzard API');
            } else {
                console.log('ℹ️ [Blizzard API] Pas de données supplémentaires (normal si non configuré)');
            }

            // 3. Construire la réponse combinée
            console.log('🔧 [WoW API] Construction des données finales...');
            const enhancedData: EnhancedGuildData = {
                name: raiderData.name,
                realm: raiderData.realm,
                region: region,
                raid_progression: raiderData.raid_progression,
                raid_rankings: raiderData.raid_rankings,
                
                // Données Blizzard si disponibles
                member_count: blizzardData?.member_count,
                faction: blizzardData?.faction?.name,
                achievement_points: blizzardData?.achievement_points,
                created_timestamp: blizzardData?.created_timestamp,
                
                data_sources: dataSources,
                last_updated: new Date()
            };

            console.log(`✅ [WoW API] Données finales compilées avec sources: ${dataSources.join(', ')}`);
            return enhancedData;

        } catch (error) {
            console.error('❌ [WoW API] Erreur lors de la récupération des données de guilde:', error);
            return null;
        }
    }

    // Fonction de test pour vérifier la configuration API Blizzard
    async testBlizzardConnection(): Promise<boolean> {
        try {
            const token = await this.getBlizzardToken();
            if (!token) {
                console.log('🔧 API Blizzard non configurée (variables d\'environnement manquantes)');
                return false;
            }

            // Test simple : récupérer les connected realms (nouvelle approche)
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
        } catch (error) {
            console.log(`❌ Erreur de connexion Blizzard: ${error.message}`);
            return false;
        }
    }
}
