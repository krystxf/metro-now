"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = exports.commonServerEnvSchema = exports.redisEnvSchema = exports.databaseEnvSchema = void 0;
const zod_1 = require("zod");
exports.databaseEnvSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().optional(),
    POSTGRES_USER: zod_1.z.string().min(1),
    POSTGRES_PASSWORD: zod_1.z.string().min(1),
    POSTGRES_DB: zod_1.z.string().min(1),
    DB_HOST: zod_1.z.string().min(1),
    DB_PORT: zod_1.z.coerce.number().int().positive(),
    DB_SCHEMA: zod_1.z.string().min(1),
});
exports.redisEnvSchema = zod_1.z.object({
    REDIS_HOST: zod_1.z.string().min(1).optional(),
    REDIS_PORT: zod_1.z.coerce.number().int().positive().optional(),
});
exports.commonServerEnvSchema = exports.databaseEnvSchema
    .merge(exports.redisEnvSchema)
    .extend({
    PORT: zod_1.z.coerce.number().int().positive().optional(),
    LOGS: zod_1.z.string().optional(),
});
const validateEnv = (schema, env = process.env) => schema.parse(env);
exports.validateEnv = validateEnv;
//# sourceMappingURL=env.js.map