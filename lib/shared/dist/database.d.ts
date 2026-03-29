import { PrismaClient } from "@prisma/client";
type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0];
type EnvSource = NodeJS.ProcessEnv;
export declare const createDatabaseUrl: (env?: EnvSource) => string;
export declare const createPrismaClientOptions: ({ env, ...options }?: PrismaClientOptions & {
    env?: EnvSource;
}) => PrismaClientOptions;
export declare const createPrismaClient: ({ env, ...options }?: PrismaClientOptions & {
    env?: EnvSource;
}) => PrismaClient;
export {};
//# sourceMappingURL=database.d.ts.map