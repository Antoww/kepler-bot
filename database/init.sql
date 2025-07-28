-- Initialisation de la base de données pour Kepler Bot
-- Table des rappels

CREATE TABLE IF NOT EXISTS reminders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reminder_id BIGINT NOT NULL UNIQUE,
    user_id VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    duration_ms BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des configurations de serveur
CREATE TABLE IF NOT EXISTS server_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    guild_id VARCHAR(20) NOT NULL UNIQUE,
    log_channel_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guild_id (guild_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 