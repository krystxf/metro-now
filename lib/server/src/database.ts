import {
    type DatabaseClient,
    type MetroNowDatabase,
} from "@metro-now/database";
import { Kysely, PostgresDialect } from "kysely";
import { Pool, type PoolConfig } from "pg";

type EnvSource = NodeJS.ProcessEnv;

const REQUIRED_DATABASE_ENV_KEYS = [
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "DB_HOST",
    "DB_PORT",
    "DB_SCHEMA",
] as const;

const unwrapEnvValue = (value: string): string => {
    const trimmedValue = value.trim();

    if (
        (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
        (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
    ) {
        return trimmedValue.slice(1, -1);
    }

    return trimmedValue;
};

const expandEnvVariables = (value: string, env: EnvSource): string => {
    return value.replace(
        /\$\{([A-Z0-9_]+)\}/g,
        (_match: string, key: string) => {
            return env[key] ?? "";
        },
    );
};

const normalizeDatabaseUrl = (
    databaseUrl: string,
    env: EnvSource,
): string | null => {
    const expandedDatabaseUrl = expandEnvVariables(
        unwrapEnvValue(databaseUrl),
        env,
    );

    try {
        return new URL(expandedDatabaseUrl).toString();
    } catch {
        return null;
    }
};

export const createDatabaseUrl = (env: EnvSource = process.env): string => {
    if (env.DATABASE_URL) {
        const normalizedDatabaseUrl = normalizeDatabaseUrl(
            env.DATABASE_URL,
            env,
        );

        if (normalizedDatabaseUrl) {
            return normalizedDatabaseUrl;
        }
    }

    const missingKeys = REQUIRED_DATABASE_ENV_KEYS.filter((key) => !env[key]);

    if (missingKeys.length > 0) {
        throw new Error(
            `Missing database environment variables: ${missingKeys.join(", ")}`,
        );
    }

    return `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.POSTGRES_DB}?schema=${env.DB_SCHEMA}`;
};

export const createDatabasePool = ({
    env = process.env,
    ...options
}: PoolConfig & {
    env?: EnvSource;
} = {}): Pool =>
    new Pool({
        connectionString: createDatabaseUrl(env),
        ...options,
    });

export const createDatabaseClient = ({
    env = process.env,
    pool = createDatabasePool({ env }),
}: {
    env?: EnvSource;
    pool?: Pool;
} = {}): DatabaseClient =>
    new Kysely<MetroNowDatabase>({
        dialect: new PostgresDialect({
            pool,
        }),
    });
