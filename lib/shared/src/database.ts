import { PrismaClient } from "@prisma/client";

type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0];

type EnvSource = NodeJS.ProcessEnv;

const REQUIRED_DATABASE_ENV_KEYS = [
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "DB_HOST",
    "DB_PORT",
    "DB_SCHEMA",
] as const;

export const createDatabaseUrl = (env: EnvSource = process.env): string => {
    if (env.DATABASE_URL) {
        return env.DATABASE_URL;
    }

    const missingKeys = REQUIRED_DATABASE_ENV_KEYS.filter((key) => !env[key]);

    if (missingKeys.length > 0) {
        throw new Error(
            `Missing database environment variables: ${missingKeys.join(", ")}`,
        );
    }

    return `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.POSTGRES_DB}?schema=${env.DB_SCHEMA}`;
};

export const createPrismaClientOptions = ({
    env = process.env,
    ...options
}: PrismaClientOptions & {
    env?: EnvSource;
} = {}): PrismaClientOptions => ({
    datasourceUrl: createDatabaseUrl(env),
    ...options,
});

export const createPrismaClient = ({
    env = process.env,
    ...options
}: PrismaClientOptions & {
    env?: EnvSource;
} = {}): PrismaClient =>
    new PrismaClient(
        createPrismaClientOptions({
            env,
            ...options,
        }),
    );
