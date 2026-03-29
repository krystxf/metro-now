"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseClient = exports.createDatabasePool = exports.createDatabaseUrl = void 0;
const kysely_1 = require("kysely");
const pg_1 = require("pg");
const REQUIRED_DATABASE_ENV_KEYS = [
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "DB_HOST",
    "DB_PORT",
    "DB_SCHEMA",
];
const unwrapEnvValue = (value) => {
    const trimmedValue = value.trim();
    if ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
        (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))) {
        return trimmedValue.slice(1, -1);
    }
    return trimmedValue;
};
const expandEnvVariables = (value, env) => {
    return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, key) => {
        return env[key] ?? "";
    });
};
const normalizeDatabaseUrl = (databaseUrl, env) => {
    const expandedDatabaseUrl = expandEnvVariables(unwrapEnvValue(databaseUrl), env);
    try {
        return new URL(expandedDatabaseUrl).toString();
    }
    catch {
        return null;
    }
};
const createDatabaseUrl = (env = process.env) => {
    if (env.DATABASE_URL) {
        const normalizedDatabaseUrl = normalizeDatabaseUrl(env.DATABASE_URL, env);
        if (normalizedDatabaseUrl) {
            return normalizedDatabaseUrl;
        }
    }
    const missingKeys = REQUIRED_DATABASE_ENV_KEYS.filter((key) => !env[key]);
    if (missingKeys.length > 0) {
        throw new Error(`Missing database environment variables: ${missingKeys.join(", ")}`);
    }
    return `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.POSTGRES_DB}?schema=${env.DB_SCHEMA}`;
};
exports.createDatabaseUrl = createDatabaseUrl;
const createDatabasePool = ({ env = process.env, ...options } = {}) => new pg_1.Pool({
    connectionString: (0, exports.createDatabaseUrl)(env),
    ...options,
});
exports.createDatabasePool = createDatabasePool;
const createDatabaseClient = ({ env = process.env, pool = (0, exports.createDatabasePool)({ env }), } = {}) => new kysely_1.Kysely({
    dialect: new kysely_1.PostgresDialect({
        pool,
    }),
});
exports.createDatabaseClient = createDatabaseClient;
//# sourceMappingURL=database.js.map