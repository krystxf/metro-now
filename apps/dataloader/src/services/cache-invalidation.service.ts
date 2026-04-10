import Redis from "ioredis";

import { logger } from "../utils/logger";

/**
 * Cache key prefix groups that correspond to backend service caches.
 * Keyv stores keys as `keyv:<cacheKey>`, so we scan for `keyv:<prefix>*`.
 */
const CACHE_PREFIX_GROUPS = {
    stop: ["keyv:stop.*"],
    platform: ["keyv:platform.*"],
    route: ["keyv:route.*"],
} as const;

type CachePrefixGroup = keyof typeof CACHE_PREFIX_GROUPS;

/**
 * Maps synced entity types to the cache prefix groups they affect.
 *
 * - stops → stop caches (stops include platform/entrance data)
 * - platforms → stop + platform caches
 * - routes → stop + platform + route caches (routes are nested in platforms/stops)
 * - platformRoutes → stop + platform + route caches
 * - gtfsRoutes → route caches
 * - gtfsRouteStops → route caches
 * - gtfsRouteShapes → route caches
 * - gtfsStationEntrances → stop caches
 * - gtfsTrips → route caches
 * - gtfsStopTimes → stop + route caches
 * - gtfsCalendars → route caches
 * - gtfsCalendarDates → route caches
 * - gtfsTransfers → stop + platform caches
 */
const ENTITY_TO_CACHE_GROUPS: Record<string, CachePrefixGroup[]> = {
    stops: ["stop"],
    platforms: ["stop", "platform"],
    routes: ["stop", "platform", "route"],
    platformRoutes: ["stop", "platform", "route"],
    gtfsRoutes: ["route"],



                gtfsRouteStops: ["route"],
    gtfsRouteShapes: ["route"],
    gtfsStationEntrances: ["stop"],
    gtfsTrips: ["route"],
    gtfsStopTimes: ["stop", "route"],
    gtfsCalendars: ["route"],
    gtfsCalendarDates: ["route"],
    gtfsTransfers: ["stop", "platform"],
};

const SCAN_BATCH_SIZE = 200;

export class CacheInvalidationService {
    private redis: Redis | null = null;

    constructor(
        private readonly redisHost: string,
        private readonly redisPort: number,
    ) {}

    async connect(): Promise<void> {
        this.redis = new Redis({
            host: this.redisHost,
            port: this.redisPort,
            lazyConnect: true,
            maxRetriesPerRequest: 3
        });

        await this.redis.connect();
    }

    async disconnect(): Promise<void> {
        await this.redis?.quit();
        this.redis = null;
    }

    async invalidateForChangedEntities(
        changedEntities: readonly string[],
    ): Promise<number> {
        if (!this.redis) {
            logger.warn("Cache invalidation skipped: Redis not connected");

            return 0;
        }

        const groupsToInvalidate = new Set<CachePrefixGroup>();

        for (const entity of changedEntities) {
            const groups = ENTITY_TO_CACHE_GROUPS[entity];

            if (groups) {
                for (const group of groups) {
                    groupsToInvalidate.add(group);
                }
            }
        }

        if (groupsToInvalidate.size === 0) {
            return 0;
        }

        const patterns = [...groupsToInvalidate].flatMap(
            (group) => CACHE_PREFIX_GROUPS[group],
        );

        let totalDeleted = 0;

        for (const pattern of patterns) {
            totalDeleted += await this.deleteKeysByPattern(pattern);
        }

        logger.info("Invalidated backend caches", {
            groups: [...groupsToInvalidate],
            totalDeleted,
        });

        return totalDeleted;
    }

    private async deleteKeysByPattern(pattern: string): Promise<number> {
        if (!this.redis) {
            return 0;
        }

        let cursor = "0";
        let deleted = 0;

        do {
            const [nextCursor, keys] = await this.redis.scan(
                cursor,
                "MATCH",
                pattern,
                "COUNT",
                SCAN_BATCH_SIZE,
            );

            cursor = nextCursor;

            if (keys.length > 0) {
                await this.redis.del(...keys);
                deleted += keys.length;
            }
        } while (cursor !== "0");

        return deleted;
    }
}
