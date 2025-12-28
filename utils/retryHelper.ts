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
