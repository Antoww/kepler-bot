/**
 * Utilitaire pour gérer les retry automatiques avec backoff exponentiel
 */

interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Exécute une fonction asynchrone avec retry automatique en cas d'erreur
 * @param fn Fonction asynchrone à exécuter
 * @param options Options de configuration du retry
 * @returns Le résultat de la fonction
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        onRetry
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Si c'est la dernière tentative, on lance l'erreur
            if (attempt === maxRetries) {
                break;
            }

            // Calculer le délai avec backoff exponentiel
            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

            // Callback optionnel pour logger les tentatives
            if (onRetry) {
                onRetry(attempt + 1, lastError);
            }

            // Attendre avant de réessayer
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Vérifie si une erreur est due à un problème réseau temporaire
 */
export function isNetworkError(error: unknown): boolean {
    const errorMessage = (error as Error)?.message?.toLowerCase() || '';
    const errorString = String(error).toLowerCase();
    
    return (
        errorMessage.includes('connection reset') ||
        errorMessage.includes('connection error') ||
        errorMessage.includes('network error') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('etimedout') ||
        errorMessage.includes('fetch failed') ||
        errorString.includes('connection reset') ||
        errorString.includes('network error')
    );
}

/**
 * Vérifie si une erreur est due à une maintenance (5xx errors)
 */
export function isMaintenanceError(error: unknown): boolean {
    const errorMessage = (error as Error)?.message?.toLowerCase() || '';
    const errorString = String(error).toLowerCase();
    
    return (
        errorMessage.includes('upstream connect error') ||
        errorMessage.includes('delayed connect error: 111') ||
        errorMessage.includes('ssl handshake failed') ||
        errorMessage.includes('web server is down') ||
        errorMessage.includes('error code 521') ||
        errorMessage.includes('error code 525') ||
        errorMessage.includes('error code 502') ||
        errorMessage.includes('error code 503') ||
        errorString.includes('<!doctype html>') // Erreurs HTML Cloudflare
    );
}

/**
 * Circuit breaker pour gérer les maintenances prolongées
 */
class CircuitBreaker {
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private isOpen: boolean = false;
    private readonly threshold: number;
    private readonly timeout: number;
    private readonly cooldownPeriod: number;

    constructor(
        threshold: number = 3,
        timeout: number = 5 * 60 * 1000, // 5 minutes
        cooldownPeriod: number = 60 * 1000 // 1 minute
    ) {
        this.threshold = threshold;
        this.timeout = timeout;
        this.cooldownPeriod = cooldownPeriod;
    }

    /**
     * Enregistre un succès et réinitialise le compteur
     */
    recordSuccess(): void {
        this.failureCount = 0;
        this.isOpen = false;
    }

    /**
     * Enregistre un échec
     */
    recordFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.threshold) {
            this.isOpen = true;
        }
    }

    /**
     * Vérifie si le circuit breaker autorise une tentative
     */
    canAttempt(): boolean {
        if (!this.isOpen) {
            return true;
        }

        const timeSinceLastFailure = Date.now() - this.lastFailureTime;
        
        // Après le timeout, on teste avec un cooldown progressif
        if (timeSinceLastFailure >= this.timeout) {
            return true;
        }

        return false;
    }

    /**
     * Obtient le temps restant avant la prochaine tentative
     */
    getTimeUntilNextAttempt(): number {
        if (!this.isOpen) return 0;
        
        const timeSinceLastFailure = Date.now() - this.lastFailureTime;
        const remaining = this.timeout - timeSinceLastFailure;
        
        return Math.max(0, remaining);
    }

    /**
     * Obtient le statut du circuit breaker
     */
    getStatus(): { isOpen: boolean; failureCount: number; nextAttemptIn: number } {
        return {
            isOpen: this.isOpen,
            failureCount: this.failureCount,
            nextAttemptIn: this.getTimeUntilNextAttempt()
        };
    }
}

// Instance partagée du circuit breaker pour la base de données
const dbCircuitBreaker = new CircuitBreaker(3, 5 * 60 * 1000, 60 * 1000);

export { CircuitBreaker, dbCircuitBreaker };

/**
 * Retry spécifique pour les appels réseau
 */
export function withNetworkRetry<T>(
    fn: () => Promise<T>,
    context: string = 'opération réseau'
): Promise<T> {
    return withRetry(fn, {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        onRetry: (attempt, error) => {
            console.warn(
                `⚠️ Tentative ${attempt}/3 pour ${context} échouée:`,
                error.message
            );
        }
    });
}
