// @deno-types="npm:mysql2@^3.9.2"
import mysql from 'npm:mysql2@^3.9.2/promise';

// Configuration de la base de données
const dbConfig = {
    host: Deno.env.get('DB_HOST') || 'localhost',
    port: parseInt(Deno.env.get('DB_PORT') || '3306'),
    user: Deno.env.get('DB_USER') || 'kepler_bot',
    password: Deno.env.get('DB_PASSWORD') || 'kepler_password',
    database: Deno.env.get('DB_NAME') || 'kepler_bot_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Pool de connexions
let pool: mysql.Pool | null = null;

// Initialiser la connexion à la base de données avec retry
export async function initDatabase(): Promise<void> {
    const maxRetries = 5;
    const retryDelay = 5000; // 5 secondes

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Tentative de connexion à MariaDB (${attempt}/${maxRetries})...`);
            pool = mysql.createPool(dbConfig);
            
            // Tester la connexion
            const connection = await pool.getConnection();
            console.log('✅ Connexion à MariaDB établie avec succès');
            connection.release();
            return;
        } catch (error) {
            console.error(`❌ Erreur lors de la connexion à MariaDB (tentative ${attempt}/${maxRetries}):`, error);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            console.log(`⏳ Nouvelle tentative dans ${retryDelay/1000} secondes...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}

// Obtenir une connexion du pool
export async function getConnection() {
    if (!pool) {
        throw new Error('Base de données non initialisée');
    }
    return pool.getConnection();
}

// Interface pour les rappels
export interface DatabaseReminder {
    id: number;
    reminder_id: number;
    user_id: string;
    message: string;
    duration_ms: number;
    timestamp: number;
    created_at: Date;
}

// Créer un nouveau rappel
export async function createReminder(reminderId: number, userId: string, message: string, durationMs: number, timestamp: number): Promise<void> {
    if (!pool) {
        throw new Error('Base de données non initialisée');
    }

    const query = `
        INSERT INTO reminders (reminder_id, user_id, message, duration_ms, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    await pool.execute(query, [reminderId, userId, message, durationMs, timestamp]);
}

// Récupérer un rappel par son ID
export async function getReminder(reminderId: number): Promise<DatabaseReminder | null> {
    if (!pool) {
        throw new Error('Base de données non initialisée');
    }

    const query = 'SELECT * FROM reminders WHERE reminder_id = ?';
    const [rows] = await pool.execute(query, [reminderId]);
    
    const results = rows as DatabaseReminder[];
    return results.length > 0 ? results[0] : null;
}

// Récupérer tous les rappels d'un utilisateur
export async function getUserReminders(userId: string): Promise<DatabaseReminder[]> {
    if (!pool) {
        throw new Error('Base de données non initialisée');
    }

    const query = 'SELECT * FROM reminders WHERE user_id = ? ORDER BY timestamp ASC';
    const [rows] = await pool.execute(query, [userId]);
    
    return rows as DatabaseReminder[];
}

// Supprimer un rappel
export async function deleteReminder(reminderId: number): Promise<void> {
    if (!pool) {
        throw new Error('Base de données non initialisée');
    }

    const query = 'DELETE FROM reminders WHERE reminder_id = ?';
    await pool.execute(query, [reminderId]);
}

// Récupérer tous les rappels expirés
export async function getExpiredReminders(): Promise<DatabaseReminder[]> {
    if (!pool) {
        throw new Error('Base de données non initialisée');
    }

    const currentTime = Date.now();
    const query = 'SELECT * FROM reminders WHERE timestamp <= ? ORDER BY timestamp ASC';
    const [rows] = await pool.execute(query, [currentTime]);
    
    return rows as DatabaseReminder[];
}

// Fermer la connexion à la base de données
export async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('🔌 Connexion à MariaDB fermée');
    }
} 