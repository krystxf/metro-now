import KeyvRedis from "@keyv/redis";
import type { CacheModuleAsyncOptions } from "@nestjs/cache-manager";
import Keyv from "keyv";

export const cacheModuleConfig: CacheModuleAsyncOptions = {
    isGlobal: true,
    useFactory: async () => {
        return {
            stores: [
                new Keyv({
                    store: new KeyvRedis(
                        `redis://${process.env.REDIS_HOST || "localhost"}:${Number.parseInt(process.env.REDIS_PORT || "6379")}`,
                    ),
                }),
            ],
        };
    },
};
