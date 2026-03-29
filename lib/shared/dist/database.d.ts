import { type DatabaseClient } from "@metro-now/database";
import { Pool, type PoolConfig } from "pg";
type EnvSource = NodeJS.ProcessEnv;
export declare const createDatabaseUrl: (env?: EnvSource) => string;
export declare const createDatabasePool: ({ env, ...options }?: PoolConfig & {
    env?: EnvSource;
}) => Pool;
export declare const createDatabaseClient: ({ env, pool, }?: {
    env?: EnvSource;
    pool?: Pool;
}) => DatabaseClient;
export {};
//# sourceMappingURL=database.d.ts.map