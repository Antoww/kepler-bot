-- Initialisation de la base de données Supabase pour Kepler Bot
-- Table des rappels

CREATE TABLE IF NOT EXISTS reminders (
    id BIGSERIAL PRIMARY KEY,
    reminder_id BIGINT NOT NULL UNIQUE,
    user_id VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    duration_ms BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT reminders_reminder_id_unique UNIQUE (reminder_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_timestamp ON reminders(timestamp);

-- Table des configurations de serveur
CREATE TABLE IF NOT EXISTS server_configs (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL UNIQUE,
    log_channel_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT server_configs_guild_id_unique UNIQUE (guild_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_server_configs_guild_id ON server_configs(guild_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_server_configs_updated_at 
    BEFORE UPDATE ON server_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Table des anniversaires
CREATE TABLE IF NOT EXISTS birthdays (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    birth_day INTEGER NOT NULL CHECK (birth_day >= 1 AND birth_day <= 31),
    birth_month INTEGER NOT NULL CHECK (birth_month >= 1 AND birth_month <= 12),
    birth_year INTEGER CHECK (birth_year >= 1900 AND birth_year <= 2100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT birthdays_guild_user_unique UNIQUE (guild_id, user_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_birthdays_guild_id ON birthdays(guild_id);
CREATE INDEX IF NOT EXISTS idx_birthdays_user_id ON birthdays(user_id);
CREATE INDEX IF NOT EXISTS idx_birthdays_date ON birthdays(birth_month, birth_day);

-- Ajouter une colonne pour le canal d'anniversaires dans server_configs
ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS birthday_channel_id VARCHAR(20);

-- Trigger pour mettre à jour automatiquement updated_at sur birthdays
CREATE TRIGGER update_birthdays_updated_at 
    BEFORE UPDATE ON birthdays 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Politique RLS (Row Level Security) - Désactivée par défaut pour simplifier
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE server_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE birthdays DISABLE ROW LEVEL SECURITY; 