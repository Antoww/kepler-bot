/**
 * Système de logging centralisé pour Kepler Bot
 * Gère tous les logs de l'application avec des niveaux de priorité
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SUCCESS = 4
}

export interface LogOptions {
    category?: string;
    timestamp?: boolean;
}

class Logger {
    private minLevel: LogLevel = LogLevel.INFO;
    
    constructor() {
        // Définir le niveau de log selon l'environnement
        const envLevel = Deno.env.get('LOG_LEVEL');
        if (envLevel === 'DEBUG') this.minLevel = LogLevel.DEBUG;
        else if (envLevel === 'WARN') this.minLevel = LogLevel.WARN;
        else if (envLevel === 'ERROR') this.minLevel = LogLevel.ERROR;
    }

    private formatMessage(level: LogLevel, category: string | undefined, message: string, data?: unknown): string {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        const prefix = category ? `[${category}]` : '';
        
        const levelIcons = {
            [LogLevel.DEBUG]: '🔍',
            [LogLevel.INFO]: 'ℹ️',
            [LogLevel.WARN]: '⚠️',
            [LogLevel.ERROR]: '❌',
            [LogLevel.SUCCESS]: '✅'
        };

        const icon = levelIcons[level];
        let formatted = `${timestamp} ${icon} ${prefix} ${message}`;
        
        if (data !== undefined) {
            // Gestion spéciale pour les erreurs
            if (data instanceof Error) {
                formatted += `\n  Message: ${data.message}`;
                if (data.stack) {
                    formatted += `\n  Stack: ${data.stack}`;
                }
            } else if (typeof data === 'object') {
                formatted += ' ' + JSON.stringify(data, null, 2);
            } else {
                formatted += ' ' + data;
            }
        }
        
        return formatted;
    }

    private log(level: LogLevel, category: string | undefined, message: string, data?: unknown) {
        if (level < this.minLevel) return;

        const formatted = this.formatMessage(level, category, message, data);
        
        if (level === LogLevel.ERROR) {
            console.error(formatted);
        } else if (level === LogLevel.WARN) {
            console.warn(formatted);
        } else {
            console.log(formatted);
        }
    }

    debug(message: string, data?: unknown, category?: string) {
        this.log(LogLevel.DEBUG, category, message, data);
    }

    info(message: string, data?: unknown, category?: string) {
        this.log(LogLevel.INFO, category, message, data);
    }

    warn(message: string, data?: unknown, category?: string) {
        this.log(LogLevel.WARN, category, message, data);
    }

    error(message: string, error?: unknown, category?: string) {
        this.log(LogLevel.ERROR, category, message, error);
    }

    success(message: string, data?: unknown, category?: string) {
        this.log(LogLevel.SUCCESS, category, message, data);
    }

    // Méthodes spécialisées pour les événements courants
    command(commandName: string, userId: string, username: string) {
        this.info(`Commande /${commandName} exécutée par ${username} (${userId})`, undefined, 'COMMAND');
    }

    event(eventName: string, details?: string) {
        this.info(`Événement: ${eventName}${details ? ' - ' + details : ''}`, undefined, 'EVENT');
    }

    database(operation: string, details?: unknown) {
        this.info(operation, details, 'DATABASE');
    }

    manager(name: string, action: string, details?: unknown) {
        this.info(`${name}: ${action}`, details, 'MANAGER');
    }

    api(service: string, action: string, status: 'success' | 'error', details?: unknown) {
        if (status === 'success') {
            this.success(`${service}: ${action}`, details, 'API');
        } else {
            this.error(`${service}: ${action}`, details, 'API');
        }
    }
}

// Export d'une instance unique (singleton)
export const logger = new Logger();
