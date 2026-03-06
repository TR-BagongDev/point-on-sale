import { z } from "zod";

/**
 * Environment variable validation schema.
 * Validates required env vars at startup to fail fast with clear error messages.
 */
const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().optional(),

    // Auth (AUTH_SECRET or NEXTAUTH_SECRET — CI uses NEXTAUTH_SECRET)
    AUTH_SECRET: z.string().min(1).optional(),
    NEXTAUTH_SECRET: z.string().min(1).optional(),

    // App
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
}).refine(
    (data) => data.AUTH_SECRET || data.NEXTAUTH_SECRET,
    { message: "AUTH_SECRET or NEXTAUTH_SECRET is required", path: ["AUTH_SECRET"] }
);

/**
 * Validated environment variables.
 * Import this instead of using `process.env` directly for type-safe access.
 *
 * @example
 * ```ts
 * import { env } from "@/lib/env";
 * console.log(env.DATABASE_URL); // typed and validated
 * ```
 */
export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
