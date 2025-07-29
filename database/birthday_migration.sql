-- Migration pour ajouter le système d'anniversaires
-- À exécuter si vous avez déjà une base de données existante

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

-- Ajouter une colonne pour le canal d'anniversaires dans server_configs si elle n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='server_configs' AND column_name='birthday_channel_id') THEN
        ALTER TABLE server_configs ADD COLUMN birthday_channel_id VARCHAR(20);
    END IF;
END $$;

-- Permettre NULL pour log_channel_id car un serveur peut configurer les anniversaires sans les logs
ALTER TABLE server_configs ALTER COLUMN log_channel_id DROP NOT NULL;

-- Trigger pour mettre à jour automatiquement updated_at sur birthdays
CREATE TRIGGER update_birthdays_updated_at 
    BEFORE UPDATE ON birthdays 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Politique RLS (Row Level Security) - Désactivée par défaut pour simplifier
ALTER TABLE birthdays DISABLE ROW LEVEL SECURITY;
