import type {
    GtfsStationEntrance,
    Platform,
    Route,
    Stop,
} from "@metro-now/database";
import { CACHE_MANAGER, type Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";

import {
    CACHE_KEYS,
    CACHE_TTL,
    uniqueSortedStrings,
} from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import {
    METRO_LINES,
    TRAIN_PREFIXES,
} from "src/modules/route/route.const";
import { loadCachedBatch } from "src/utils/cache-batch";

type StopRecordBase = Pick<
    Stop,
    "avgLatitude" | "avgLongitude" | "id" | "name"
>;

type PlatformRouteRecord = Pick<Route, "id" | "name">;

type StopPlatformRecord = Pick<
    Platform,
    "code" | "id" | "isMetro" | "latitude" | "longitude" | "name" | "stopId"
> & {
    routes: PlatformRouteRecord[];
};

type StopEntranceRecord = Pick<
    GtfsStationEntrance,
    "id" | "latitude" | "longitude" | "name"
>;

type StopRecord = StopRecordBase & {
    entrances: StopEntranceRecord[];
    platforms: StopPlatformRecord[];
};

type StopGraphQLPlatformRecord = Pick<Platform, "id">;

type StopGraphQLRecord = StopRecordBase & {
    entrances: StopEntranceRecord[];
    platforms: StopGraphQLPlatformRecord[];
};

const STOP_DATA_CACHE_TTL_MS = CACHE_TTL.stopData;

const normalizeRouteName = (routeName: string): string =>
    routeName.startsWith("X") ? routeName.slice(1) : routeName;

const isRailRouteName = (routeName: string): boolean => {
    const normalizedRouteName = normalizeRouteName(routeName).toUpperCase();

    return (
        METRO_LINES.includes(normalizedRouteName) ||
        TRAIN_PREFIXES.some((prefix) =>
            normalizedRouteName.startsWith(prefix),
        )
    );
};

const uniquePlatformNames = (
    platforms: readonly Pick<Platform, "name">[],
): string[] =>
    Array.from(
        new Set(
            platforms
                .map((platform) => platform.name.trim())
                .filter((name) => name.length > 0),
        ),
    );

const resolveMetroOnlyStopName = ({
    stopName,
    platforms,
}: {
    stopName: string;
    platforms: readonly Pick<Platform, "name">[];
}): string => {
    const metroPlatformNames = uniquePlatformNames(platforms);

    return metroPlatformNames.length === 1 ? metroPlatformNames[0] : stopName;
};

const resolveRailStopName = ({
    stopName,
    platforms,
}: {
    stopName: string;
    platforms: readonly StopPlatformRecord[];
}): string => {
    const metroPlatformNames = uniquePlatformNames(
        platforms.filter((platform) => platform.isMetro),
    );

    if (metroPlatformNames.length === 1) {
        return metroPlatformNames[0];
    }

    const trainPlatformNames = uniquePlatformNames(
        platforms.filter((platform) => !platform.isMetro),
    );

    return trainPlatformNames.length === 1 ? trainPlatformNames[0] : stopName;
};

const filterRailPlatforms = (
    platforms: readonly StopPlatformRecord[],
): StopPlatformRecord[] =>
    platforms.flatMap((platform) => {
        const railRoutes = platform.routes.filter((route) =>
            isRailRouteName(route.name),
        );

        if (!platform.isMetro && railRoutes.length === 0) {
            return [];
        }

        return [
            {
                ...platform,
                routes: railRoutes,
            },
        ];
    });

@Injectable()
export class StopService {
    constructor(
        private readonly database: DatabaseService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    private async loadStopRows({
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
            .select(["id", "name", "avgLatitude", "avgLongitude"]);

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

    private async loadPlatformRoutesByPlatformIds(
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

    private async loadPlatformsByStopIds({
        stopIds,
        metroOnly,
        railOnly,
    }: {
        stopIds: readonly string[];
        metroOnly?: boolean;
        railOnly?: boolean;
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
            ])
            .where("stopId", "in", [...stopIds])
            .orderBy("stopId", "asc")
            .orderBy("id", "asc");

        if (metroOnly) {
            query = query.where("isMetro", "=", true);
        }

        const platforms = await query.execute();
        const routesByPlatformId = await this.loadPlatformRoutesByPlatformIds(
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

        if (railOnly) {
            for (const [stopId, platforms] of platformsByStopId) {
                platformsByStopId.set(stopId, filterRailPlatforms(platforms));
            }
        }

        return platformsByStopId;
    }

    private async loadRailStopIds({
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
            .innerJoin("Route", "Route.id", "PlatformsOnRoutes.routeId")
            .select([
                "Platform.stopId as stopId",
                "Platform.isMetro as isMetro",
                "Route.name as routeName",
            ])
            .where("Platform.stopId", "is not", null)
            .orderBy("Platform.stopId", "asc")
            .orderBy("Route.name", "asc")
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

        return stopIds.slice(normalizedOffset, normalizedOffset + normalizedLimit);
    }

    private async loadStopGraphQLPlatformIdsByStopIds(
        stopIds: readonly string[],
    ): Promise<Map<string, StopGraphQLPlatformRecord[]>> {
        const platformsByStopId = new Map<string, StopGraphQLPlatformRecord[]>(
            stopIds.map((stopId) => [stopId, []]),
        );

        if (stopIds.length === 0) {
            return platformsByStopId;
        }

        const rows = await this.database.db
            .selectFrom("Platform")
            .select(["id", "stopId"])
            .where("stopId", "in", [...stopIds])
            .orderBy("stopId", "asc")
            .orderBy("id", "asc")
            .execute();

        for (const row of rows) {
            if (!row.stopId) {
                continue;
            }

            platformsByStopId.get(row.stopId)?.push({
                id: row.id,
            });
        }

        return platformsByStopId;
    }

    private async loadStopEntrancesByStopIds(
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

    private async loadGraphQLStopsByIds(
        ids: readonly string[],
    ): Promise<Map<string, StopGraphQLRecord | null>> {
        const stops = await this.loadStopRows({
            ids,
        });
        const platformIdsByStopId =
            await this.loadStopGraphQLPlatformIdsByStopIds(
                stops.map((stop) => stop.id),
            );
        const entrancesByStopId = await this.loadStopEntrancesByStopIds(
            stops.map((stop) => stop.id),
        );
        const stopsById = new Map<string, StopGraphQLRecord | null>(
            stops.map((stop) => [
                stop.id,
                {
                    ...stop,
                    entrances: entrancesByStopId.get(stop.id) ?? [],
                    platforms: platformIdsByStopId.get(stop.id) ?? [],
                },
            ]),
        );

        for (const id of ids) {
            if (!stopsById.has(id)) {
                stopsById.set(id, null);
            }
        }

        return stopsById;
    }

    async getAll({
        metroOnly,
        railOnly,
        limit,
        offset,
    }: {
        metroOnly: boolean;
        railOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<StopRecord[]> {
        return this.cacheManager.wrap(
            CACHE_KEYS.stop.getAll({
                metroOnly,
                railOnly,
                limit,
                offset,
            }),
            async () => {
                const stopIds = railOnly
                    ? await this.loadRailStopIds({
                          limit,
                          offset,
                      })
                    : (
                          await this.database.db
                              .selectFrom("Platform")
                              .select("stopId")
                              .distinct()
                              .where("stopId", "is not", null)
                              .$if(metroOnly, (qb) =>
                                  qb.where("isMetro", "=", true),
                              )
                              .$if(typeof offset === "number", (qb) =>
                                  qb.offset(offset!),
                              )
                              .$if(typeof limit === "number", (qb) =>
                                  qb.limit(limit!),
                              )
                              .orderBy("stopId", "asc")
                              .execute()
                      ).flatMap(({ stopId }) => (stopId ? [stopId] : []));
                const stops = await this.loadStopRows({
                    ids: stopIds,
                });
                const platformsByStopId = await this.loadPlatformsByStopIds({
                    stopIds: stops.map((stop) => stop.id),
                    ...(metroOnly ? { metroOnly: true } : {}),
                    ...(railOnly ? { railOnly: true } : {}),
                });
                const entrancesByStopId = await this.loadStopEntrancesByStopIds(
                    stops.map((stop) => stop.id),
                );
                const stopById = new Map(stops.map((stop) => [stop.id, stop]));

                return stopIds
                    .map((stopId) => {
                        const stop = stopById.get(stopId);

                        if (!stop) {
                            return null;
                        }

                        const platforms = platformsByStopId.get(stop.id) ?? [];

                        if (railOnly && platforms.length === 0) {
                            return null;
                        }

                        return {
                            ...stop,
                            ...((metroOnly || railOnly)
                                ? {
                                      name: metroOnly
                                          ? resolveMetroOnlyStopName({
                                                stopName: stop.name,
                                                platforms,
                                            })
                                          : resolveRailStopName({
                                                stopName: stop.name,
                                                platforms,
                                            }),
                                  }
                                : {}),
                            entrances: entrancesByStopId.get(stop.id) ?? [],
                            platforms,
                        };
                    })
                    .filter((stop): stop is StopRecord => stop !== null);
            },
            STOP_DATA_CACHE_TTL_MS,
        );
    }

    async getAllGraphQL({
        limit,
        offset,
    }: {
        limit?: number;
        offset?: number;
    }): Promise<StopGraphQLRecord[]> {
        return this.cacheManager.wrap(
            CACHE_KEYS.stop.getAllGraphQL({
                limit,
                offset,
            }),
            async () => {
                const stops = await this.loadStopRows({
                    ...(typeof limit === "number" ? { limit } : {}),
                    ...(typeof offset === "number" ? { offset } : {}),
                });
                const platformIdsByStopId =
                    await this.loadStopGraphQLPlatformIdsByStopIds(
                        stops.map((stop) => stop.id),
                    );
                const entrancesByStopId = await this.loadStopEntrancesByStopIds(
                    stops.map((stop) => stop.id),
                );

                return stops.map((stop) => ({
                    ...stop,
                    entrances: entrancesByStopId.get(stop.id) ?? [],
                    platforms: platformIdsByStopId.get(stop.id) ?? [],
                }));
            },
            STOP_DATA_CACHE_TTL_MS,
        );
    }

    async getGraphQLByIds(
        ids: readonly string[],
    ): Promise<StopGraphQLRecord[]> {
        const stopsById = await loadCachedBatch({
            cacheManager: this.cacheManager,
            getCacheKey: CACHE_KEYS.stop.getGraphQLById,
            keys: ids,
            loadMissing: async (missingIds) =>
                this.loadGraphQLStopsByIds(missingIds),
            ttlMs: STOP_DATA_CACHE_TTL_MS,
        });

        return Array.from(new Set(ids))
            .map((id) => stopsById.get(id))
            .filter((stop): stop is StopGraphQLRecord => stop !== null);
    }

    async getOneById(id: string): Promise<StopRecord | null> {
        return this.cacheManager.wrap(
            CACHE_KEYS.stop.getOne({ id }),
            async () => {
                const [stop] = await this.loadStopRows({
                    ids: [id],
                });

                if (!stop) {
                    return null;
                }

                const platformsByStopId = await this.loadPlatformsByStopIds({
                    stopIds: [id],
                });
                const entrancesByStopId = await this.loadStopEntrancesByStopIds(
                    [id],
                );

                return {
                    ...stop,
                    entrances: entrancesByStopId.get(id) ?? [],
                    platforms: platformsByStopId.get(id) ?? [],
                };
            },
            STOP_DATA_CACHE_TTL_MS,
        );
    }
}
