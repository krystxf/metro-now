import { sql } from "@metro-now/database";
import { Injectable } from "@nestjs/common";

import { uniqueSortedStrings } from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import { isRailRouteName } from "src/modules/stop/stop-name.utils";
import type {
    PlatformRouteRecord,
    StopEntranceRecord,
    StopPlatformRecord,
    StopRecordBase,
} from "src/modules/stop/stop.types";

const normalizeUpdatedAt = (
    updatedAt: Date | string | null | undefined,
): Date | null => {
    if (!updatedAt) {
        return null;
    }

    const parsedDate =
        updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

@Injectable()
export class StopRepository {
    constructor(private readonly database: DatabaseService) {}

    async findStops({
        ids,
        limit,
        offset,
    }: {
        ids?: readonly string[];
        limit?: number;
        offset?: number;
    }): Promise<StopRecordBase[]> {
        if (ids && ids.length === 0) {
            return [];
        }

        let query = this.database.db
            .selectFrom("Stop")
            .select(["id", "feed", "name", "avgLatitude", "avgLongitude"]);

        if (ids) {
            query = query.where("id", "in", [...ids]);
        }

        if (typeof offset === "number") {
            query = query.offset(offset);
        }

        if (typeof limit === "number") {
            query = query.limit(limit);
        }

        return query.orderBy("id", "asc").execute();
    }

    async findSearchablePlatformRows(): Promise<
        { isMetro: boolean; name: string; stopId: string | null }[]
    > {
        return this.database.db
            .selectFrom("Platform")
            .select(["stopId", "name", "isMetro"])
            .where("stopId", "is not", null)
            .orderBy("stopId", "asc")
            .orderBy("name", "asc")
            .execute();
    }

    async findPlatformRoutesByPlatformIds(
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
            .innerJoin("GtfsRoute", (join) =>
                join
                    .onRef("GtfsRoute.id", "=", "PlatformsOnRoutes.routeId")
                    .onRef("GtfsRoute.feedId", "=", "PlatformsOnRoutes.feedId"),
            )
            .select([
                "PlatformsOnRoutes.platformId as platformId",
                "GtfsRoute.id as routeId",
                "GtfsRoute.shortName as routeName",
                "GtfsRoute.color as routeColor",
                "GtfsRoute.feedId as routeFeedId",
                "GtfsRoute.vehicleType as routeVehicleType",
            ])
            .where("PlatformsOnRoutes.platformId", "in", [...platformIds])
            .orderBy("PlatformsOnRoutes.platformId", "asc")
            .orderBy("GtfsRoute.id", "asc")
            .execute();

        for (const row of rows) {
            routesByPlatformId.get(row.platformId)?.push({
                id: row.routeId,
                name: row.routeName,
                color: row.routeColor ?? null,
                feed: row.routeFeedId,
                vehicleType: row.routeVehicleType ?? null,
            });
        }

        return routesByPlatformId;
    }

    async findPlatformsByStopIds({
        stopIds,
        metroOnly,
    }: {
        stopIds: readonly string[];
        metroOnly?: boolean;
    }): Promise<Map<string, StopPlatformRecord[]>> {
        const platformsByStopId = new Map<string, StopPlatformRecord[]>(
            stopIds.map((stopId) => [stopId, []]),
        );

        if (stopIds.length === 0) {
            return platformsByStopId;
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
                "direction",
            ])
            .where("stopId", "in", [...stopIds])
            .orderBy("stopId", "asc")
            .orderBy("id", "asc");

        if (metroOnly) {
            query = query.where("isMetro", "=", true);
        }

        const platforms = await query.execute();
        const routesByPlatformId = await this.findPlatformRoutesByPlatformIds(
            platforms.map((platform) => platform.id),
        );

        for (const platform of platforms) {
            if (!platform.stopId) {
                continue;
            }

            platformsByStopId.get(platform.stopId)?.push({
                ...platform,
                routes: routesByPlatformId.get(platform.id) ?? [],
            });
        }

        return platformsByStopId;
    }

    async findRailStopIds({
        limit,
        offset,
    }: {
        limit?: number;
        offset?: number;
    }): Promise<string[]> {
        const rows = await this.database.db
            .selectFrom("Platform")
            .innerJoin(
                "PlatformsOnRoutes",
                "PlatformsOnRoutes.platformId",
                "Platform.id",
            )
            .innerJoin("GtfsRoute", (join) =>
                join
                    .onRef("GtfsRoute.id", "=", "PlatformsOnRoutes.routeId")
                    .onRef("GtfsRoute.feedId", "=", "PlatformsOnRoutes.feedId"),
            )
            .select([
                "Platform.stopId as stopId",
                "Platform.isMetro as isMetro",
                "GtfsRoute.shortName as routeName",
            ])
            .where("Platform.stopId", "is not", null)
            .orderBy("Platform.stopId", "asc")
            .orderBy("GtfsRoute.shortName", "asc")
            .execute();

        const stopIds = uniqueSortedStrings(
            rows.flatMap(({ isMetro, routeName, stopId }) =>
                stopId && (isMetro || isRailRouteName(routeName))
                    ? [stopId]
                    : [],
            ),
        );

        const normalizedOffset = offset ?? 0;
        const normalizedLimit = limit ?? stopIds.length;

        return stopIds.slice(
            normalizedOffset,
            normalizedOffset + normalizedLimit,
        );
    }

    async findStopEntrancesByStopIds(
        stopIds: readonly string[],
    ): Promise<Map<string, StopEntranceRecord[]>> {
        const entrancesByStopId = new Map<string, StopEntranceRecord[]>(
            stopIds.map((stopId) => [stopId, []]),
        );

        if (stopIds.length === 0) {
            return entrancesByStopId;
        }

        const rows = await this.database.db
            .selectFrom("GtfsStationEntrance")
            .select(["id", "latitude", "longitude", "name", "stopId"])
            .where("stopId", "in", [...stopIds])
            .orderBy("stopId", "asc")
            .orderBy("id", "asc")
            .execute();

        for (const row of rows) {
            entrancesByStopId.get(row.stopId)?.push({
                id: row.id,
                latitude: row.latitude,
                longitude: row.longitude,
                name: row.name,
            });
        }

        return entrancesByStopId;
    }

    async findDataLastUpdatedAt(): Promise<string | null> {
        const [stopResult, platformResult] = await Promise.all([
            this.database.db
                .selectFrom("Stop")
                .select(({ fn }) => fn.max("updatedAt").as("updatedAt"))
                .executeTakeFirstOrThrow(),
            this.database.db
                .selectFrom("Platform")
                .select(({ fn }) => fn.max("updatedAt").as("updatedAt"))
                .executeTakeFirstOrThrow(),
        ]);

        const latestUpdatedAt = [stopResult.updatedAt, platformResult.updatedAt]
            .flatMap((updatedAt) => {
                const parsedDate = normalizeUpdatedAt(updatedAt);

                return parsedDate ? [parsedDate] : [];
            })
            .sort((left, right) => right.getTime() - left.getTime())[0];

        return latestUpdatedAt?.toISOString() ?? null;
    }

    async findStopIdsWithPlatforms({
        limit,
        metroOnly,
        offset,
    }: {
        limit?: number;
        metroOnly?: boolean;
        offset?: number;
    }): Promise<string[]> {
        let platformStopIdsQuery = this.database.db
            .selectFrom("Platform")
            .select("stopId")
            .distinct()
            .where("stopId", "is not", null);

        if (metroOnly) {
            platformStopIdsQuery = platformStopIdsQuery.where(
                "isMetro",
                "=",
                true,
            );
        }

        if (typeof offset === "number") {
            platformStopIdsQuery = platformStopIdsQuery.offset(offset);
        }

        if (typeof limit === "number") {
            platformStopIdsQuery = platformStopIdsQuery.limit(limit);
        }

        const platformStopIdRows = await platformStopIdsQuery
            .orderBy("stopId", "asc")
            .execute();

        return platformStopIdRows.flatMap(({ stopId }) =>
            stopId ? [stopId] : [],
        );
    }

    async findClosestStops({
        latitude,
        longitude,
        limit,
    }: {
        latitude: number;
        longitude: number;
        limit: number;
    }): Promise<{ distance: number; id: string }[]> {
        const result = await sql<{ distance: number; id: string }>`
            SELECT
                "Stop"."id",
                earth_distance(
                    ll_to_earth("Stop"."avgLatitude", "Stop"."avgLongitude"),
                    ll_to_earth(${latitude}, ${longitude})
                ) AS "distance"
            FROM "Stop"
            ORDER BY ll_to_earth("Stop"."avgLatitude", "Stop"."avgLongitude")
                <-> ll_to_earth(${latitude}, ${longitude})
            LIMIT ${limit}
        `.execute(this.database.db);

        return result.rows;
    }
}
