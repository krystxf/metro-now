import { z } from "zod";

export const envSchema = z.object({
    GOLEMIO_API_KEY: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DB: z.string(),
    DB_HOST: z.string(),
    DB_PORT: z.coerce.number().int().positive(),
    DB_SCHEMA: z.string(),
    REDIS_PORT: z.coerce.number().int().positive().optional(),
    REDIS_HOST: z.string().optional(),
    PORT: z.coerce.number().int().positive().optional(),
    LOGS: z.string().optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;
