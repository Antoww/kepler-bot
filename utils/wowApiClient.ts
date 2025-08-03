// Configuration pour les APIs externes WoW
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
        if (!WOW_API_CONFIG.BLIZZARD.CLIENT_ID || !WOW_API_CONFIG.BLIZZARD.CLIENT_SECRET) {
            return null;
        }

        // Vérifier si le token est encore valide
        if (this.blizzardToken && Date.now() < this.tokenExpiry) {
            return this.blizzardToken;
        }

        try {
            const credentials = `${WOW_API_CONFIG.BLIZZARD.CLIENT_ID}:${WOW_API_CONFIG.BLIZZARD.CLIENT_SECRET}`;
            const encodedCredentials = btoa(credentials);
            
            const response = await fetch('https://oauth.battle.net/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${encodedCredentials}`
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                throw new Error('Failed to get Blizzard token');
            }

            const data = await response.json();
            this.blizzardToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // -1 minute de sécurité

            return this.blizzardToken;
        } catch (error) {
            console.error('Erreur lors de l\'obtention du token Blizzard:', error);
            return null;
        }
    }

    async getGuildFromBlizzard(region: string, realm: string, guild: string): Promise<any | null> {
        const token = await this.getBlizzardToken();
        if (!token) return null;

        try {
            const response = await fetch(
                `${WOW_API_CONFIG.BLIZZARD.BASE_URL}${WOW_API_CONFIG.BLIZZARD.ENDPOINTS.GUILD}/${realm}/${guild}?namespace=profile-${region}&locale=fr_FR&access_token=${token}`
            );

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Erreur API Blizzard:', error);
            return null;
        }
    }

    async getEnhancedGuildData(region: string, realm: string, guild: string): Promise<EnhancedGuildData | null> {
        const dataSources: string[] = [];
        
        // 1. Données principales de Raider.IO
        const encodedGuild = encodeURIComponent(guild);
        const encodedRealm = encodeURIComponent(realm);
        
        try {
            const raiderResponse = await fetch(
                `${WOW_API_CONFIG.RAIDER_IO.BASE_URL}${WOW_API_CONFIG.RAIDER_IO.ENDPOINTS.GUILD_PROFILE}?region=${region}&realm=${encodedRealm}&name=${encodedGuild}&fields=raid_progression,raid_rankings,mythic_plus_ranks`
            );

            if (!raiderResponse.ok) {
                throw new Error('Guilde non trouvée sur Raider.IO');
            }

            const raiderData = await raiderResponse.json();
            dataSources.push('Raider.IO');

            // 2. Données supplémentaires de Blizzard (si configuré)
            const blizzardData = await this.getGuildFromBlizzard(region, realm, guild);
            if (blizzardData) {
                dataSources.push('Blizzard API');
            }

            // 3. Construire la réponse combinée
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

            return enhancedData;

        } catch (error) {
            console.error('Erreur lors de la récupération des données de guilde:', error);
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
