type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: string;
    meta?: Record<string, unknown>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const isProduction = process.env.NODE_ENV === "production";
const minLevel: LogLevel = isProduction ? "info" : "debug";

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatError(error: unknown): LogEntry["error"] | undefined {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: isProduction ? undefined : error.stack,
        };
    }
    if (error !== undefined && error !== null) {
        return {
            name: "UnknownError",
            message: String(error),
        };
    }
    return undefined;
}

function log(
    level: LogLevel,
    message: string,
    options?: { context?: string; error?: unknown; meta?: Record<string, unknown> }
): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        context: options?.context,
        meta: options?.meta,
        error: formatError(options?.error),
    };

    if (isProduction) {
        // JSON output for log aggregation in production
        const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
        consoleFn(JSON.stringify(entry));
    } else {
        // Readable output for development
        const prefix = `[${entry.timestamp.slice(11, 19)}] [${level.toUpperCase().padEnd(5)}]`;
        const ctx = entry.context ? ` [${entry.context}]` : "";
        const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : level === "debug" ? console.debug : console.log;

        consoleFn(`${prefix}${ctx} ${message}`);
        if (entry.meta && Object.keys(entry.meta).length > 0) {
            consoleFn("  Meta:", entry.meta);
        }
        if (entry.error) {
            consoleFn(`  Error: ${entry.error.name}: ${entry.error.message}`);
            if (entry.error.stack) {
                consoleFn(`  Stack: ${entry.error.stack}`);
            }
        }
    }
}

/**
 * Structured logger with severity levels.
 * - Production: JSON output for log aggregation (Sentry, Datadog, etc.)
 * - Development: Readable console output with timestamps
 *
 * @example
 * ```ts
 * import { logger } from "@/lib/logger";
 * logger.info("Order created", { context: "OrderAPI", meta: { orderId: "123" } });
 * logger.error("Failed to create order", { context: "OrderAPI", error: err });
 * ```
 */
export const logger = {
    debug(message: string, options?: { context?: string; meta?: Record<string, unknown> }) {
        log("debug", message, options);
    },

    info(message: string, options?: { context?: string; meta?: Record<string, unknown> }) {
        log("info", message, options);
    },

    warn(message: string, options?: { context?: string; meta?: Record<string, unknown> }) {
        log("warn", message, options);
    },

    error(message: string, options?: { context?: string; error?: unknown; meta?: Record<string, unknown> }) {
        log("error", message, options);
    },
};
