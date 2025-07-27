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