// Configuration pour les APIs externes WoW
import { encodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";

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
        CLIENT_ID: Deno.env.get('BLIZZARD_CLIENT_ID') || '',
        CLIENT_SECRET: Deno.env.get('BLIZZARD_CLIENT_SECRET') || '',
        ENDPOINTS: {
            GUILD: '/data/wow/guild',
            GUILD_ROSTER: '/data/wow/guild/roster',
            GUILD_ACHIEVEMENTS: '/data/wow/guild/achievements'
        }
    },
    
    // WarcraftLogs - Pour les logs de combat détaillés
    // API: https://www.warcraftlogs.com/api/docs
    WARCRAFTLOGS: {
        BASE_URL: 'https://www.warcraftlogs.com/v1',
        API_KEY: Deno.env.get('WARCRAFTLOGS_API_KEY') || '',
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
        console.log('🔑 [Blizzard API] Vérification des credentials...');
        
        // Récupérer les variables d'environnement à chaque appel
        const clientId = Deno.env.get('BLIZZARD_CLIENT_ID');
        const clientSecret = Deno.env.get('BLIZZARD_CLIENT_SECRET');
        
        console.log('🔍 [Blizzard API] Variables d\'environnement:', {
            clientId: clientId ? `${clientId.substring(0, 8)}...` : 'NON TROUVÉ',
            clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : 'NON TROUVÉ'
        });
        
        if (!clientId || !clientSecret) {
            console.log('❌ [Blizzard API] Variables d\'environnement manquantes');
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

    async getGuildFromBlizzard(region: string, realm: string, guild: string): Promise<any | null> {
        console.log(`🏰 [Blizzard API] Récupération guilde: ${guild} (${realm}, ${region})`);
        
        const token = await this.getBlizzardToken();
        if (!token) {
            console.log('❌ [Blizzard API] Pas de token disponible');
            return null;
        }

        try {
            const url = `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.GUILD}/${realm}/${guild}?namespace=profile-${region}&locale=fr_FR&access_token=${token}`;
            console.log(`🌐 [Blizzard API] Appel: ${url}`);
            
            const response = await fetch(url);

            if (!response.ok) {
                console.log(`❌ [Blizzard API] Erreur ${response.status}: ${response.statusText}`);
                return null;
            }
            
            const data = await response.json();
            console.log(`✅ [Blizzard API] Données guilde récupérées:`, {
                name: data.name,
                member_count: data.member_count,
                faction: data.faction?.name,
                achievement_points: data.achievement_points
            });
            
            return data;
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

            // Test simple : récupérer la liste des royaumes
            const response = await fetch(
                `${WOW_API_CONFIG.BLIZZARD.BASE_URL}/data/wow/realm/index?namespace=dynamic-eu&locale=fr_FR&access_token=${token}`
            );

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ API Blizzard opérationnelle (${data.realms?.length || 0} royaumes disponibles)`);
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
