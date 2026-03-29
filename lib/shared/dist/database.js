"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaClient = exports.createPrismaClientOptions = exports.createDatabaseUrl = void 0;
const client_1 = require("@prisma/client");
const REQUIRED_DATABASE_ENV_KEYS = [
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "DB_HOST",
    "DB_PORT",
    "DB_SCHEMA",
];
const createDatabaseUrl = (env = process.env) => {
    if (env.DATABASE_URL) {
        return env.DATABASE_URL;
    }
    const missingKeys = REQUIRED_DATABASE_ENV_KEYS.filter((key) => !env[key]);
    if (missingKeys.length > 0) {
        throw new Error(`Missing database environment variables: ${missingKeys.join(", ")}`);
    }
    return `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.POSTGRES_DB}?schema=${env.DB_SCHEMA}`;
};
exports.createDatabaseUrl = createDatabaseUrl;
const createPrismaClientOptions = ({ env = process.env, ...options } = {}) => ({
    datasourceUrl: (0, exports.createDatabaseUrl)(env),
    ...options,
});
exports.createPrismaClientOptions = createPrismaClientOptions;
const createPrismaClient = ({ env = process.env, ...options } = {}) => new client_1.PrismaClient((0, exports.createPrismaClientOptions)({
    env,
    ...options,
}));
exports.createPrismaClient = createPrismaClient;
//# sourceMappingURL=database.js.map