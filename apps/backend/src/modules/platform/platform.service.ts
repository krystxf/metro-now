import type { Platform, Route } from "@metro-now/database";
import { sql } from "@metro-now/database";
import { CACHE_MANAGER, type Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import type { PlatformWithDistanceSchema } from "src/modules/platform/schema/platform-with-distance.schema";
import type { PlatformSchema } from "src/modules/platform/schema/platform.schema";
import type { BoundingBox } from "src/schema/bounding-box.schema";
import { loadCachedBatch } from "src/utils/cache-batch";
import { minMax } from "src/utils/math";

type PlatformRouteRecord = Pick<Route, "id" | "name">;

type PlatformRecordBase = Pick<
    Platform,
    "code" | "id" | "isMetro" | "latitude" | "longitude" | "name" | "stopId"
>;

type PlatformRecord = PlatformRecordBase & {
    routes: PlatformRouteRecord[];
};

type PlatformGraphQLRecord = PlatformRecordBase;

const PLATFORM_DATA_CACHE_TTL_MS = CACHE_TTL.platformData;

@Injectable()
export class PlatformService {
    constructor(
        private readonly database: DatabaseService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    private async loadPlatformRows({
        ids,
        metroOnly,
        boundingBox,
    }: {
        ids?: readonly string[];
        metroOnly?: boolean;
        boundingBox?: BoundingBox;
    }): Promise<PlatformRecordBase[]> {
        if (ids && ids.length === 0) {
            return [];
        }

        let query = this.database.db
            .selectFrom("Platform")
            .select([
                "id",
                "latitude",
                "longitude",
                "name",
                "isMetro",
                "stopId",
                "code",
            ]);

        if (ids) {
            query = query.where("id", "in", [...ids]);
        }

        if (metroOnly) {
            query = query.where("isMetro", "=", true);
        }

        if (boundingBox) {
            const latitude = minMax(boundingBox.latitude);
            const longitude = minMax(boundingBox.longitude);

            query = query
                .where("latitude", ">=", latitude.min)
                .where("latitude", "<=", latitude.max)
                .where("longitude", ">=", longitude.min)
                .where("longitude", "<=", longitude.max);
        }

        return query.orderBy("id", "asc").execute();
    }

    private async loadRoutesByPlatformIds(
        platformIds: readonly string[],
    ): Promise<Map<string, PlatformRouteRecord[]>> {
        const routesByPlatformId = new Map<string, PlatformRouteRecord[]>(
            platformIds.map((platformId) => [platformId, []]),
        );

        if (platformIds.length === 0) {
            return routesByPlatformId;
        }

        const rows = await this.database.db
            .selectFrom("PlatformsOnRoutes")
            .innerJoin("Route", "Route.id", "PlatformsOnRoutes.routeId")
            .select([
                "PlatformsOnRoutes.platformId as platformId",
                "Route.id as routeId",
                "Route.name as routeName",
            ])
            .where("PlatformsOnRoutes.platformId", "in", [...platformIds])
            .orderBy("PlatformsOnRoutes.platformId", "asc")
            .orderBy("Route.id", "asc")
            .execute();

        for (const row of rows) {
            routesByPlatformId.get(row.platformId)?.push({
                id: row.routeId,
                name: row.routeName,
            });
        }

        return routesByPlatformId;
    }

    private async loadPlatformsWithRoutes({
        ids,
        metroOnly,
        boundingBox,
    }: {
        ids?: readonly string[];
        metroOnly?: boolean;
        boundingBox?: BoundingBox;
    }): Promise<PlatformRecord[]> {
        const platforms = await this.loadPlatformRows({
            ...(ids ? { ids } : {}),
            ...(metroOnly ? { metroOnly } : {}),
            ...(boundingBox ? { boundingBox } : {}),
        });
        const routesByPlatformId = await this.loadRoutesByPlatformIds(
            platforms.map((platform) => platform.id),
        );

        return platforms.map((platform) => ({
            ...platform,
            routes: routesByPlatformId.get(platform.id) ?? [],
        }));
    }

    private async loadGraphQLPlatformsByIds(
        ids: readonly string[],
    ): Promise<Map<string, PlatformGraphQLRecord | null>> {
        const platforms = await this.loadPlatformRows({
            ids,
        });
        const platformsById = new Map<string, PlatformGraphQLRecord | null>(
            platforms.map((platform) => [platform.id, platform]),
        );

        for (const id of ids) {
            if (!platformsById.has(id)) {
                platformsById.set(id, null);
            }
        }

        return platformsById;
    }

    async getPlatformsByDistance({
        latitude,
        longitude,
        count,
        metroOnly,
    }: {
        latitude: number;
        longitude: number;
        count: number;
        metroOnly: boolean;
    }): Promise<PlatformWithDistanceSchema[]> {
        const whereClause = metroOnly
            ? sql`WHERE "Platform"."isMetro" = true`
            : sql``;
        const limitClause = count > 0 ? sql`LIMIT ${count}` : sql``;
        const result = await sql<{ distance: number; id: string }>`
            SELECT
                "Platform"."id",
                earth_distance(
                    ll_to_earth("Platform"."latitude", "Platform"."longitude"),
                    ll_to_earth(${latitude}, ${longitude})
                ) AS "distance"
            FROM "Platform"
            ${whereClause}
            ORDER BY "distance"
            ${limitClause}
        `.execute(this.database.db);

        const orderedPlatformIds = result.rows.map(({ id }) => id);
        const distanceByPlatformId = new Map(
            result.rows.map(({ id, distance }) => [id, distance]),
        );
        const platforms = await this.loadPlatformsWithRoutes({
            ids: orderedPlatformIds,
        });
        const platformsById = new Map(
            platforms.map((platform) => [platform.id, platform]),
        );

        return orderedPlatformIds
            .map((id) => {
                const platform = platformsById.get(id);

                if (!platform) {
                    return null;
                }

                return {
                    ...platform,
                    distance: distanceByPlatformId.get(id) ?? 0,
                };
            })
            .filter(
                (
                    platform,
                ): platform is PlatformWithDistanceSchema & PlatformRecord =>
                    platform !== null,
            );
    }

    async getPlatformsInBoundingBox({
        boundingBox,
        metroOnly,
    }: {
        boundingBox: BoundingBox;
        metroOnly: boolean;
    }): Promise<PlatformSchema[]> {
        return this.loadPlatformsWithRoutes({
            boundingBox,
            metroOnly,
        });
    }

    async getAll({
        metroOnly,
    }: {
        metroOnly: boolean;
    }): Promise<PlatformSchema[]> {
        return this.loadPlatformsWithRoutes({
            metroOnly,
        });
    }

    async getAllGraphQL({
        metroOnly,
    }: {
        metroOnly: boolean;
    }): Promise<PlatformGraphQLRecord[]> {
        return this.cacheManager.wrap(
            CACHE_KEYS.platform.getAllGraphQL({
                metroOnly,
            }),
            async () =>
                await this.loadPlatformRows({
                    metroOnly,
                }),
            PLATFORM_DATA_CACHE_TTL_MS,
        );
    }

    async getGraphQLByIds(
        ids: readonly string[],
    ): Promise<PlatformGraphQLRecord[]> {
        const platformsById = await loadCachedBatch({
            cacheManager: this.cacheManager,
            getCacheKey: CACHE_KEYS.platform.getGraphQLById,
            keys: ids,
            loadMissing: async (missingIds) =>
                this.loadGraphQLPlatformsByIds(missingIds),
            ttlMs: PLATFORM_DATA_CACHE_TTL_MS,
        });

        return Array.from(new Set(ids))
            .map((id) => platformsById.get(id))
            .filter(
                (platform): platform is PlatformGraphQLRecord =>
                    platform !== null,
            );
    }

    async getOneById(id: string): Promise<PlatformRecord | null> {
        return this.cacheManager.wrap(
            CACHE_KEYS.platform.getOne({ id }),
            async () => {
                const [platform] = await this.loadPlatformsWithRoutes({
                    ids: [id],
                });

                return platform ?? null;
            },
            PLATFORM_DATA_CACHE_TTL_MS,
        );
    }
}
