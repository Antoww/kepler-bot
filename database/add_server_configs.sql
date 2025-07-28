-- Ajout de la table server_configs si elle n'existe pas
CREATE TABLE IF NOT EXISTS server_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    guild_id VARCHAR(20) NOT NULL UNIQUE,
    log_channel_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guild_id (guild_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 