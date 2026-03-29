import { z } from "zod";
export declare const databaseEnvSchema: z.ZodObject<{
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    POSTGRES_USER: z.ZodString;
    POSTGRES_PASSWORD: z.ZodString;
    POSTGRES_DB: z.ZodString;
    DB_HOST: z.ZodString;
    DB_PORT: z.ZodNumber;
    DB_SCHEMA: z.ZodString;
}, "strip", z.ZodTypeAny, {
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_SCHEMA: string;
    DATABASE_URL?: string | undefined;
}, {
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_SCHEMA: string;
    DATABASE_URL?: string | undefined;
}>;
export declare const redisEnvSchema: z.ZodObject<{
    REDIS_HOST: z.ZodOptional<z.ZodString>;
    REDIS_PORT: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    REDIS_HOST?: string | undefined;
    REDIS_PORT?: number | undefined;
}, {
    REDIS_HOST?: string | undefined;
    REDIS_PORT?: number | undefined;
}>;
export declare const commonServerEnvSchema: z.ZodObject<z.objectUtil.extendShape<z.objectUtil.extendShape<{
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    POSTGRES_USER: z.ZodString;
    POSTGRES_PASSWORD: z.ZodString;
    POSTGRES_DB: z.ZodString;
    DB_HOST: z.ZodString;
    DB_PORT: z.ZodNumber;
    DB_SCHEMA: z.ZodString;
}, {
    REDIS_HOST: z.ZodOptional<z.ZodString>;
    REDIS_PORT: z.ZodOptional<z.ZodNumber>;
}>, {
    PORT: z.ZodOptional<z.ZodNumber>;
    LOGS: z.ZodOptional<z.ZodString>;
}>, "strip", z.ZodTypeAny, {
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_SCHEMA: string;
    DATABASE_URL?: string | undefined;
    REDIS_HOST?: string | undefined;
    REDIS_PORT?: number | undefined;
    PORT?: number | undefined;
    LOGS?: string | undefined;
}, {
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_SCHEMA: string;
    DATABASE_URL?: string | undefined;
    REDIS_HOST?: string | undefined;
    REDIS_PORT?: number | undefined;
    PORT?: number | undefined;
    LOGS?: string | undefined;
}>;
export declare const validateEnv: <Schema extends z.ZodTypeAny>(schema: Schema, env?: NodeJS.ProcessEnv) => z.infer<Schema>;
//# sourceMappingURL=env.d.ts.map