import type { CacheModuleAsyncOptions } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-yet";

export const cacheModuleConfig: CacheModuleAsyncOptions = {
    isGlobal: true,
    useFactory: async () => ({
        store: await redisStore({
            socket: {
                host: process.env.REDIS_HOST || "localhost",
                port: parseInt(process.env.REDIS_PORT || "6379"),
            },
        }),
    }),
};
