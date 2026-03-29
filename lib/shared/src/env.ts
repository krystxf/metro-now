import { z } from "zod";

export const databaseEnvSchema = z.object({
    DATABASE_URL: z.string().optional(),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DB: z.string().min(1),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive(),
    DB_SCHEMA: z.string().min(1),
});

export const redisEnvSchema = z.object({
    REDIS_HOST: z.string().min(1).optional(),
    REDIS_PORT: z.coerce.number().int().positive().optional(),
});

export const commonServerEnvSchema = databaseEnvSchema
    .merge(redisEnvSchema)
    .extend({
        PORT: z.coerce.number().int().positive().optional(),
        LOGS: z.string().optional(),
    });

export const validateEnv = <Schema extends z.ZodTypeAny>(
    schema: Schema,
    env: NodeJS.ProcessEnv = process.env,
): z.infer<Schema> => schema.parse(env);
