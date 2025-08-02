-- Migration pour ajouter les fonctionnalités de modération

-- Ajouter la colonne moderation_channel_id à la table server_configs
ALTER TABLE server_configs 
ADD COLUMN IF NOT EXISTS moderation_channel_id VARCHAR(20);

-- Créer la table pour les bans temporaires
CREATE TABLE IF NOT EXISTS temp_bans (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table pour les mutes temporaires
CREATE TABLE IF NOT EXISTS temp_mutes (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_temp_bans_guild_user ON temp_bans(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_temp_bans_end_time ON temp_bans(end_time);
CREATE INDEX IF NOT EXISTS idx_temp_mutes_guild_user ON temp_mutes(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_temp_mutes_end_time ON temp_mutes(end_time);

-- Ajouter des commentaires sur les tables
COMMENT ON TABLE temp_bans IS 'Stockage des bannissements temporaires';
COMMENT ON TABLE temp_mutes IS 'Stockage des mutes temporaires';
COMMENT ON COLUMN server_configs.moderation_channel_id IS 'Canal où sont envoyés les logs de modération';
