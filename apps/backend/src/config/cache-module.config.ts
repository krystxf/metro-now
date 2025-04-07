import KeyvRedis from "@keyv/redis";
import type { CacheModuleAsyncOptions } from "@nestjs/cache-manager";

export const cacheModuleConfig: CacheModuleAsyncOptions = {
    isGlobal: true,
    useFactory: async () => {
        return {
            stores: [
                new KeyvRedis(
                    `redis://${process.env.REDIS_HOST || "localhost"}:${parseInt(process.env.REDIS_PORT || "6379")}`,
                ),
            ],
        };
    },
};
