import { z } from "zod";

export const envSchema = z.object({
    GOLEMIO_API_KEY: z.string(),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DB: z.string(),
    DB_HOST: z.string(),
    DB_PORT: z.coerce.number().int().positive(),
    DB_SCHEMA: z.string(),
    PORT: z.coerce.number().int().positive().optional(),
});