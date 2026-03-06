/**
 * Simple in-memory rate limiter using sliding window.
 * Tracks request counts per key (typically IP address) within a time window.
 *
 * Note: This is an in-memory implementation. In a multi-instance deployment,
 * consider using Redis or a shared store instead.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
}

interface RateLimitOptions {
    /** Time window in milliseconds */
    interval: number;
    /** Maximum requests allowed within the interval */
    limit: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup(): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;

    lastCleanup = now;
    for (const [key, entry] of store) {
        if (now >= entry.resetAt) {
            store.delete(key);
        }
    }
}

/**
 * Creates a rate limiter with the given options.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ interval: 60_000, limit: 100 });
 * const result = limiter.check("user-ip");
 * if (!result.success) {
 *   return new Response("Too Many Requests", { status: 429 });
 * }
 * ```
 */
export function createRateLimiter(options: RateLimitOptions) {
    return {
        check(key: string): RateLimitResult {
            cleanup();

            const now = Date.now();
            const entry = store.get(key);

            if (!entry || now >= entry.resetAt) {
                // New window
                const newEntry: RateLimitEntry = {
                    count: 1,
                    resetAt: now + options.interval,
                };
                store.set(key, newEntry);
                return {
                    success: true,
                    limit: options.limit,
                    remaining: options.limit - 1,
                    resetAt: newEntry.resetAt,
                };
            }

            // Existing window
            entry.count++;
            const remaining = Math.max(0, options.limit - entry.count);

            return {
                success: entry.count <= options.limit,
                limit: options.limit,
                remaining,
                resetAt: entry.resetAt,
            };
        },

        /** Reset the limiter for a specific key (useful for testing) */
        reset(key: string): void {
            store.delete(key);
        },

        /** Clear all entries */
        clear(): void {
            store.clear();
        },
    };
}

/**
 * Pre-configured rate limiter for API routes.
 * 100 requests per 60 seconds per IP.
 */
export const apiRateLimiter = createRateLimiter({
    interval: 60_000,
    limit: 100,
});
