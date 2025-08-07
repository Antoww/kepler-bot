// Configuration simple pour Raider.IO uniquement
// Raider.IO est gratuit, fiable et a une excellente couverture des serveurs français

// Fonction pour normaliser un nom de royaume pour Raider.IO
function normalizeRealmName(realmName: string): string[] {
    const input = realmName.toLowerCase().trim();
    const variations: string[] = [];
    
    // 1. Version simple avec tirets (format Raider.IO standard)
    variations.push(input.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
    
    // 2. Sans espaces ni caractères spéciaux
    variations.push(input.replace(/[^a-z0-9]/g, ''));
    
    // 3. Avec apostrophes transformées en tirets
    variations.push(input.replace(/['\s]/g, '-').replace(/[^a-z0-9-]/g, ''));
    
    // 4. Mappings directs pour les serveurs populaires
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
    // Raider.IO - API gratuite et fiable
    RAIDER_IO: {
        BASE_URL: 'https://raider.io/api/v1',
        ENDPOINTS: {
            GUILD_PROFILE: '/guilds/profile'
        }
    }
};

// Interface pour les données de guilde (Raider.IO)
export interface GuildData {
    name: string;
    realm: string;
    region: string;
    faction: string;
    raid_progression: Record<string, unknown>;
    raid_rankings: Record<string, unknown>;
    mythic_plus_ranks?: Record<string, unknown>;
    profile_url: string;
    last_crawled_at: string;
}

// Client API simplifié pour Raider.IO uniquement
export class WoWAPIClient {
    
    /**
     * Récupère les données d'une guilde via Raider.IO
     * Utilise la normalisation intelligente pour les serveurs français
     */
    async getGuildData(region: string, realm: string, guild: string): Promise<GuildData | null> {
        console.log(`📊 [Raider.IO] Récupération guilde: ${guild} (${realm}, ${region})`);
        
        try {
            // Utiliser les variations normalisées pour maximiser les chances de succès
            const realmVariations = normalizeRealmName(realm);
            const encodedGuild = encodeURIComponent(guild);
            
            console.log(`🔍 [Raider.IO] Test avec ${realmVariations.length} variations de serveur: ${realmVariations.join(', ')}`);
            
            let guildData = null;
            let usedVariation = '';
            
            for (const realmVariation of realmVariations) {
                const encodedRealm = encodeURIComponent(realmVariation);
                const url = `${WOW_API_CONFIG.RAIDER_IO.BASE_URL}${WOW_API_CONFIG.RAIDER_IO.ENDPOINTS.GUILD_PROFILE}?region=${region}&realm=${encodedRealm}&name=${encodedGuild}&fields=raid_progression,raid_rankings,mythic_plus_ranks`;
                
                console.log(`🌐 [Raider.IO] Test variation '${realmVariation}': ${url}`);
                
                const response = await fetch(url);
                
                if (response.ok) {
                    guildData = await response.json();
                    usedVariation = realmVariation;
                    console.log(`✅ [Raider.IO] Guilde trouvée avec variation '${realmVariation}' pour: ${guildData.name}`);
                    break;
                } else {
                    console.log(`⚠️ [Raider.IO] Échec avec variation '${realmVariation}': ${response.status} ${response.statusText}`);
                }
            }

            if (!guildData) {
                console.log(`❌ [Raider.IO] Guilde introuvable avec toutes les variations testées`);
                console.log(`💡 [Raider.IO] Suggestions:`);
                console.log(`   - Vérifiez l'orthographe du nom de guilde: '${guild}'`);
                console.log(`   - Vérifiez l'orthographe du serveur: '${realm}'`);
                console.log(`   - Vérifiez que la région est correcte: '${region}'`);
                console.log(`   - Essayez de chercher la guilde sur https://raider.io/`);
                return null;
            }

            console.log(`✅ [Raider.IO] Données récupérées avec succès via '${usedVariation}'`);
            console.log(`📈 [Raider.IO] Raids: ${Object.keys(guildData.raid_progression || {}).length}, Classements: ${Object.keys(guildData.raid_rankings || {}).length}`);
            
            return guildData as GuildData;
            
        } catch (error) {
            console.error('❌ [Raider.IO] Erreur lors de la récupération:', error);
            return null;
        }
    }

    /**
     * Test de connexion à Raider.IO (simple ping)
     */
    async testConnection(): Promise<boolean> {
        try {
            console.log('🧪 [Raider.IO] Test de connexion...');
            const response = await fetch(`${WOW_API_CONFIG.RAIDER_IO.BASE_URL}/guilds/profile?region=eu&realm=kirin-tor&name=method&fields=raid_progression`);
            
            if (response.ok) {
                console.log('✅ [Raider.IO] API accessible');
                return true;
            } else {
                console.log(`⚠️ [Raider.IO] Réponse inattendue: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('❌ [Raider.IO] Erreur de connexion:', error);
            return false;
        }
    }
}
