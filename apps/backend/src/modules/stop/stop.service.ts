import type {
    GtfsFeedId,
    GtfsStationEntrance,
    Platform,
    Route,
    Stop,
} from "@metro-now/database";
import { sql } from "@metro-now/database";
import { CACHE_MANAGER, type Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";

import {
    CACHE_KEYS,
    CACHE_TTL,
    uniqueSortedStrings,
} from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import { METRO_LINES, TRAIN_PREFIXES } from "src/modules/route/route.const";
import { loadCachedBatch } from "src/utils/cache-batch";

type StopRecordBase = Pick<
    Stop,
    "avgLatitude" | "avgLongitude" | "feed" | "id" | "name"
>;

type PlatformRouteRecord = Pick<Route, "id" | "name"> & {
    color: string | null;
};

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

type StopWithDistanceGraphQLRecord = StopGraphQLRecord & {
    distance: number;
};

type SearchableStopTerm = {
    normalizedTokens: string[];
    normalizedValue: string;
    sourceRank: number;
};

type SearchableStopRow = StopRecordBase & {
    hasMetro: boolean;
    normalizedStopName: string;
    searchTerms: SearchableStopTerm[];
};

const STOP_DATA_CACHE_TTL_MS = CACHE_TTL.stopData;
const DIACRITIC_REGEX = /\p{Diacritic}/gu;

type StopSearchMatchScore = {
    candidateLength: number;
    distance: number;
    lengthDelta: number;
    matchRank: number;
    position: number;
    sourceRank: number;
};

const tokenizeStopSearchValue = (value: string): string[] =>
    value
        .normalize("NFD")
        .replace(DIACRITIC_REGEX, "")
        .replaceAll(".", " ")
        .toLocaleLowerCase()
        .split(/\s+/)
        .filter((part) => part.length > 0);

const normalizeStopSearchValue = (value: string): string =>
    tokenizeStopSearchValue(value).join("");

const maxFuzzyDistanceForQuery = (queryLength: number): number => {
    if (queryLength <= 4) {
        return 1;
    }

    if (queryLength <= 8) {
        return 2;
    }

    return 3;
};

const damerauLevenshteinDistance = (left: string, right: string): number => {
    if (left === right) {
        return 0;
    }

    if (left.length === 0) {
        return right.length;
    }

    if (right.length === 0) {
        return left.length;
    }

    const matrix = Array.from({ length: left.length + 1 }, () =>
        Array.from<number>({ length: right.length + 1 }).fill(0),
    );

    for (let leftIndex = 0; leftIndex <= left.length; leftIndex += 1) {
        matrix[leftIndex][0] = leftIndex;
    }

    for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) {
        matrix[0][rightIndex] = rightIndex;
    }

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const substitutionCost =
                left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

            matrix[leftIndex][rightIndex] = Math.min(
                matrix[leftIndex - 1][rightIndex] + 1,
                matrix[leftIndex][rightIndex - 1] + 1,
                matrix[leftIndex - 1][rightIndex - 1] + substitutionCost,
            );

            if (
                leftIndex > 1 &&
                rightIndex > 1 &&
                left[leftIndex - 1] === right[rightIndex - 2] &&
                left[leftIndex - 2] === right[rightIndex - 1]
            ) {
                matrix[leftIndex][rightIndex] = Math.min(
                    matrix[leftIndex][rightIndex],
                    matrix[leftIndex - 2][rightIndex - 2] + 1,
                );
            }
        }
    }

    return matrix[left.length][right.length];
};

const compareStopSearchMatchScores = (
    left: StopSearchMatchScore,
    right: StopSearchMatchScore,
): number =>
    left.matchRank - right.matchRank ||
    left.distance - right.distance ||
    left.position - right.position ||
    left.lengthDelta - right.lengthDelta ||
    left.sourceRank - right.sourceRank ||
    left.candidateLength - right.candidateLength;

const compareStopSearchMatchQuality = (
    left: StopSearchMatchScore,
    right: StopSearchMatchScore,
): number =>
    left.matchRank - right.matchRank ||
    left.distance - right.distance ||
    left.position - right.position ||
    left.lengthDelta - right.lengthDelta ||
    left.candidateLength - right.candidateLength;

const getStopSearchMatchScoreForValue = ({
    normalizedCandidate,
    normalizedQuery,
    sourceRank,
}: {
    normalizedCandidate: string;
    normalizedQuery: string;
    sourceRank: number;
}): StopSearchMatchScore | null => {
    if (normalizedCandidate.length === 0) {
        return null;
    }

    if (normalizedCandidate === normalizedQuery) {
        return {
            candidateLength: normalizedCandidate.length,
            distance: 0,
            lengthDelta: 0,
            matchRank: 0,
            position: 0,
            sourceRank,
        };
    }

    if (normalizedCandidate.startsWith(normalizedQuery)) {
        return {
            candidateLength: normalizedCandidate.length,
            distance: 0,
            lengthDelta: normalizedCandidate.length - normalizedQuery.length,
            matchRank: 1,
            position: 0,
            sourceRank,
        };
    }

    const substringPosition = normalizedCandidate.indexOf(normalizedQuery);

    if (substringPosition >= 0) {
        return {
            candidateLength: normalizedCandidate.length,
            distance: 0,
            lengthDelta: normalizedCandidate.length - normalizedQuery.length,
            matchRank: 2,
            position: substringPosition,
            sourceRank,
        };
    }

    const maxDistance = maxFuzzyDistanceForQuery(normalizedQuery.length);
    const lengthDelta = Math.abs(
        normalizedCandidate.length - normalizedQuery.length,
    );

    if (lengthDelta > maxDistance) {
        return null;
    }

    const distance = damerauLevenshteinDistance(
        normalizedCandidate,
        normalizedQuery,
    );

    if (distance > maxDistance) {
        return null;
    }

    return {
        candidateLength: normalizedCandidate.length,
        distance,
        lengthDelta,
        matchRank: 3,
        position: 0,
        sourceRank,
    };
};

const getStopSearchMatchScore = ({
    normalizedQuery,
    searchableStop,
}: {
    normalizedQuery: string;
    searchableStop: SearchableStopRow;
}): StopSearchMatchScore | null => {
    let bestScore: StopSearchMatchScore | null = null;

    for (const term of searchableStop.searchTerms) {
        const candidateValues = [
            term.normalizedValue,
            ...term.normalizedTokens,
        ];

        for (const candidateValue of candidateValues) {
            const score = getStopSearchMatchScoreForValue({
                normalizedCandidate: candidateValue,
                normalizedQuery,
                sourceRank: term.sourceRank,
            });

            if (!score) {
                continue;
            }

            if (
                bestScore === null ||
                compareStopSearchMatchScores(score, bestScore) < 0
            ) {
                bestScore = score;
            }
        }
    }

    return bestScore;
};

const createSearchableStopTerm = ({
    sourceRank,
    value,
}: {
    sourceRank: number;
    value: string;
}): SearchableStopTerm => ({
    normalizedTokens: tokenizeStopSearchValue(value),
    normalizedValue: normalizeStopSearchValue(value),
    sourceRank,
});

const normalizeRouteName = (routeName: string): string =>
    routeName.startsWith("X") ? routeName.slice(1) : routeName;

const isRailRouteName = (routeName: string): boolean => {
    const normalizedRouteName = normalizeRouteName(routeName).toUpperCase();

    return (
        METRO_LINES.includes(normalizedRouteName) ||
        TRAIN_PREFIXES.some((prefix) => normalizedRouteName.startsWith(prefix))
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

    private async loadSearchableStopRows(): Promise<SearchableStopRow[]> {
        return this.cacheManager.wrap(
            CACHE_KEYS.stop.getSearchRows(),
            async () => {
                const [stops, platformRows] = await Promise.all([
                    this.loadStopRows({}),
                    this.database.db
                        .selectFrom("Platform")
                        .select(["stopId", "name", "isMetro"])
                        .where("stopId", "is not", null)
                        .orderBy("stopId", "asc")
                        .orderBy("name", "asc")
                        .execute(),
                ]);
                const platformNamesByStopId = new Map<string, Set<string>>();
                const stopIdsWithMetroPlatforms = new Set<string>();

                for (const row of platformRows) {
                    if (!row.stopId) {
                        continue;
                    }

                    const platformNames =
                        platformNamesByStopId.get(row.stopId) ?? new Set();

                    platformNames.add(row.name);
                    platformNamesByStopId.set(row.stopId, platformNames);

                    if (row.isMetro) {
                        stopIdsWithMetroPlatforms.add(row.stopId);
                    }
                }

                return stops.map((stop) => ({
                    ...stop,
                    hasMetro: stopIdsWithMetroPlatforms.has(stop.id),
                    normalizedStopName: normalizeStopSearchValue(stop.name),
                    searchTerms: [
                        createSearchableStopTerm({
                            sourceRank: 0,
                            value: stop.name,
                        }),
                        ...Array.from(platformNamesByStopId.get(stop.id) ?? [])
                            .sort((left, right) => left.localeCompare(right))
                            .map((platformName) =>
                                createSearchableStopTerm({
                                    sourceRank: 1,
                                    value: platformName,
                                }),
                            ),
                    ],
                }));
            },
            STOP_DATA_CACHE_TTL_MS,
        );
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
            .leftJoin("GtfsRoute", "GtfsRoute.id", "PlatformsOnRoutes.routeId")
            .select([
                "PlatformsOnRoutes.platformId as platformId",
                "Route.id as routeId",
                "Route.name as routeName",
                "GtfsRoute.color as routeColor",
            ])
            .where("PlatformsOnRoutes.platformId", "in", [...platformIds])
            .orderBy("PlatformsOnRoutes.platformId", "asc")
            .orderBy("Route.id", "asc")
            .execute();

        for (const row of rows) {
            routesByPlatformId.get(row.platformId)?.push({
                id: row.routeId,
                name: row.routeName,
                color: row.routeColor ?? null,
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

        return stopIds.slice(
            normalizedOffset,
            normalizedOffset + normalizedLimit,
        );
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
        const hydratedStops = await this.hydrateGraphQLStops(stops);
        const stopsById = new Map<string, StopGraphQLRecord | null>(
            hydratedStops.map((stop) => [stop.id, stop]),
        );

        for (const id of ids) {
            if (!stopsById.has(id)) {
                stopsById.set(id, null);
            }
        }

        return stopsById;
    }

    private async hydrateGraphQLStops(
        stops: readonly StopRecordBase[],
    ): Promise<StopGraphQLRecord[]> {
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
    }

    async getDataLastUpdatedAt(): Promise<string | null> {
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
                let stopIds: string[];
                if (railOnly) {
                    stopIds = await this.loadRailStopIds({
                        ...(typeof limit === "number" ? { limit } : {}),
                        ...(typeof offset === "number" ? { offset } : {}),
                    });
                } else {
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
                        platformStopIdsQuery =
                            platformStopIdsQuery.offset(offset);
                    }
                    if (typeof limit === "number") {
                        platformStopIdsQuery =
                            platformStopIdsQuery.limit(limit);
                    }
                    const platformStopIdRows = await platformStopIdsQuery
                        .orderBy("stopId", "asc")
                        .execute();
                    stopIds = platformStopIdRows.flatMap(({ stopId }) =>
                        stopId ? [stopId] : [],
                    );
                }
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
                            ...(metroOnly || railOnly
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

                return this.hydrateGraphQLStops(stops);
            },
            STOP_DATA_CACHE_TTL_MS,
        );
    }

    async searchGraphQL({
        query,
        limit,
        offset,
    }: {
        query: string;
        limit?: number;
        offset?: number;
    }): Promise<StopGraphQLRecord[]> {
        const normalizedQuery = normalizeStopSearchValue(query);

        if (normalizedQuery.length === 0) {
            return [];
        }

        return this.cacheManager.wrap(
            CACHE_KEYS.stop.searchGraphQL({
                query: normalizedQuery,
                limit,
                offset,
            }),
            async () => {
                const matchingStops = (await this.loadSearchableStopRows())
                    .flatMap((stop) => {
                        const score = getStopSearchMatchScore({
                            normalizedQuery,
                            searchableStop: stop,
                        });

                        return score ? [{ score, stop }] : [];
                    })
                    .sort((left, right) => {
                        const matchQualityOrder = compareStopSearchMatchQuality(
                            left.score,
                            right.score,
                        );

                        if (matchQualityOrder !== 0) {
                            return matchQualityOrder;
                        }

                        if (left.stop.hasMetro !== right.stop.hasMetro) {
                            return left.stop.hasMetro ? -1 : 1;
                        }

                        const scoreOrder = compareStopSearchMatchScores(
                            left.score,
                            right.score,
                        );

                        if (scoreOrder !== 0) {
                            return scoreOrder;
                        }

                        const nameOrder =
                            left.stop.normalizedStopName.localeCompare(
                                right.stop.normalizedStopName,
                            );

                        if (nameOrder !== 0) {
                            return nameOrder;
                        }

                        return left.stop.id.localeCompare(right.stop.id);
                    })
                    .map(({ stop }) => stop);
                const normalizedOffset = offset ?? 0;
                const end =
                    typeof limit === "number"
                        ? normalizedOffset + limit
                        : undefined;

                return this.hydrateGraphQLStops(
                    matchingStops.slice(normalizedOffset, end),
                );
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

    async getClosestStopsGraphQL({
        latitude,
        longitude,
        limit,
    }: {
        latitude: number;
        longitude: number;
        limit: number;
    }): Promise<StopWithDistanceGraphQLRecord[]> {
        const result = await sql<{ distance: number; id: string }>`
            SELECT
                "Stop"."id",
                earth_distance(
                    ll_to_earth("Stop"."avgLatitude", "Stop"."avgLongitude"),
                    ll_to_earth(${latitude}, ${longitude})
                ) AS "distance"
            FROM "Stop"
            ORDER BY "distance"
            LIMIT ${limit}
        `.execute(this.database.db);

        const orderedIds = result.rows.map(({ id }) => id);
        const distanceById = new Map(
            result.rows.map(({ id, distance }) => [id, distance]),
        );
        const stopsById = await this.loadGraphQLStopsByIds(orderedIds);

        return orderedIds.flatMap((id) => {
            const stop = stopsById.get(id);

            if (!stop) {
                return [];
            }

            return [{ ...stop, distance: distanceById.get(id) ?? 0 }];
        });
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
