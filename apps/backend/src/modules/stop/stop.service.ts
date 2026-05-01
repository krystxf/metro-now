import { CACHE_MANAGER, type Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";
import {
    filterRailPlatforms,
    resolveMetroOnlyStopName,
    resolveRailStopName,
} from "src/modules/stop/stop-name.utils";
import {
    type SearchableStopRow,
    compareStopSearchMatchQuality,
    compareStopSearchMatchScores,
    createSearchableStopTerm,
    getStopSearchMatchScore,
    normalizeStopSearchValue,
    squaredGeoDistance,
} from "src/modules/stop/stop-search.utils";
import { StopRepository } from "src/modules/stop/stop.repository";
import {
    type PlatformRouteRecord,
    type StopEntranceRecord,
    type StopGraphQLRecord,
    type StopPlatformRecord,
    type StopRecord,
    type StopRecordBase,
    type StopWithDistanceGraphQLRecord,
    getStopAggregateFromPlatforms,
    toLightGraphQLStops,
} from "src/modules/stop/stop.types";
import { loadCachedBatch } from "src/utils/cache-batch";

type StopGraphQLQueryOptions = {
    hydrateFields?: boolean;
};

const STOP_DATA_CACHE_TTL_MS = CACHE_TTL.stopData;

@Injectable()
export class StopService {
    constructor(
        private readonly stopRepository: StopRepository,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    /// Like `cacheManager.wrap`, but never caches an empty result.
    /// The unfiltered "all stops" queries should never legitimately return
    /// `[]` — caching one (e.g. during a reseed window) poisons the entry
    /// for the full TTL. Search-style queries that can validly be empty
    /// should keep using `wrap` directly.
    private async wrapNonEmpty<T>(
        key: string,
        loader: () => Promise<T[]>,
        ttlMs: number,
    ): Promise<T[]> {
        const cached = await this.cacheManager.get<T[]>(key);
        if (cached !== undefined && cached !== null) {
            return cached;
        }
        const fresh = await loader();
        if (fresh.length > 0) {
            await this.cacheManager.set(key, fresh, ttlMs);
        }
        return fresh;
    }

    private async loadStopRows({
        ids,
        limit,
        offset,
    }: {
        ids?: readonly string[];
        limit?: number;
        offset?: number;
    }): Promise<StopRecordBase[]> {
        return this.stopRepository.findStops({
            ...(ids ? { ids } : {}),
            ...(typeof limit === "number" ? { limit } : {}),
            ...(typeof offset === "number" ? { offset } : {}),
        });
    }

    private async loadSearchableStopRows(): Promise<SearchableStopRow[]> {
        return this.cacheManager.wrap(
            CACHE_KEYS.stop.getSearchRows(),
            async () => {
                const [stops, platformRows] = await Promise.all([
                    this.loadStopRows({}),
                    this.stopRepository.findSearchablePlatformRows(),
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

        return this.stopRepository.findPlatformRoutesByPlatformIds(platformIds);
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
        const loadedPlatformsByStopId =
            await this.stopRepository.findPlatformsByStopIds({
                stopIds,
                ...(metroOnly ? { metroOnly: true } : {}),
            });

        for (const [stopId, platforms] of loadedPlatformsByStopId) {
            platformsByStopId.set(stopId, platforms);
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
        return this.stopRepository.findRailStopIds({
            ...(typeof limit === "number" ? { limit } : {}),
            ...(typeof offset === "number" ? { offset } : {}),
        });
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

        return this.stopRepository.findStopEntrancesByStopIds(stopIds);
    }

    private async loadGraphQLStopsByIds(
        ids: readonly string[],
        options: StopGraphQLQueryOptions = {},
    ): Promise<Map<string, StopGraphQLRecord | null>> {
        const stops = await this.loadStopRows({
            ids,
        });
        const hydratedStops =
            options.hydrateFields === false
                ? toLightGraphQLStops(stops)
                : await this.hydrateGraphQLStops(stops);
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
        const stopIds = stops.map((stop) => stop.id);
        const [platformsByStopId, entrancesByStopId] = await Promise.all([
            this.loadPlatformsByStopIds({
                stopIds,
            }),
            this.loadStopEntrancesByStopIds(stopIds),
        ]);

        return stops.map((stop) => {
            const platforms = platformsByStopId.get(stop.id) ?? [];
            const aggregate = getStopAggregateFromPlatforms(platforms);

            return {
                ...stop,
                entrances: entrancesByStopId.get(stop.id) ?? [],
                platforms,
                isMetro: aggregate.isMetro,
                vehicleTypes: aggregate.vehicleTypes,
            };
        });
    }

    async getDataLastUpdatedAt(): Promise<string | null> {
        return this.stopRepository.findDataLastUpdatedAt();
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
        return this.wrapNonEmpty(
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
                    stopIds =
                        await this.stopRepository.findStopIdsWithPlatforms({
                            ...(metroOnly ? { metroOnly: true } : {}),
                            ...(typeof limit === "number" ? { limit } : {}),
                            ...(typeof offset === "number" ? { offset } : {}),
                        });
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
        hydrateFields,
    }: {
        limit?: number;
        offset?: number;
        hydrateFields?: boolean;
    }): Promise<StopGraphQLRecord[]> {
        if (hydrateFields === false) {
            const stops = await this.loadStopRows({
                ...(typeof limit === "number" ? { limit } : {}),
                ...(typeof offset === "number" ? { offset } : {}),
            });

            return toLightGraphQLStops(stops);
        }

        return this.wrapNonEmpty(
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
        latitude,
        longitude,
        hydrateFields,
    }: {
        query: string;
        limit?: number;
        offset?: number;
        latitude?: number;
        longitude?: number;
        hydrateFields?: boolean;
    }): Promise<StopGraphQLRecord[]> {
        const normalizedQuery = normalizeStopSearchValue(query);

        if (normalizedQuery.length === 0) {
            return [];
        }

        const origin =
            typeof latitude === "number" && typeof longitude === "number"
                ? { latitude, longitude }
                : undefined;

        // Quantize coords to ~11m precision so GPS jitter doesn't thrash the cache.
        const cacheOrigin = origin
            ? {
                  latitude: Math.round(origin.latitude * 10000) / 10000,
                  longitude: Math.round(origin.longitude * 10000) / 10000,
              }
            : undefined;

        const loadSearchResults = async (): Promise<StopGraphQLRecord[]> => {
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

                    if (origin) {
                        const leftDistance = squaredGeoDistance(
                            left.stop.avgLatitude,
                            left.stop.avgLongitude,
                            origin.latitude,
                            origin.longitude,
                        );
                        const rightDistance = squaredGeoDistance(
                            right.stop.avgLatitude,
                            right.stop.avgLongitude,
                            origin.latitude,
                            origin.longitude,
                        );

                        if (leftDistance !== rightDistance) {
                            return leftDistance - rightDistance;
                        }
                    }

                    return left.stop.id.localeCompare(right.stop.id);
                })
                .map(({ stop }) => stop);
            const normalizedOffset = offset ?? 0;
            const end =
                typeof limit === "number"
                    ? normalizedOffset + limit
                    : undefined;
            const pagedStops = matchingStops.slice(normalizedOffset, end);

            return hydrateFields === false
                ? toLightGraphQLStops(pagedStops)
                : this.hydrateGraphQLStops(pagedStops);
        };

        if (hydrateFields === false) {
            return loadSearchResults();
        }

        return this.cacheManager.wrap(
            CACHE_KEYS.stop.searchGraphQL({
                query: normalizedQuery,
                limit,
                offset,
                ...cacheOrigin,
            }),
            loadSearchResults,
            STOP_DATA_CACHE_TTL_MS,
        );
    }

    async getGraphQLByIds(
        ids: readonly string[],
        options: StopGraphQLQueryOptions = {},
    ): Promise<StopGraphQLRecord[]> {
        if (options.hydrateFields === false) {
            const stops = await this.loadStopRows({
                ids,
            });
            const lightStopsById = new Map(
                toLightGraphQLStops(stops).map((stop) => [stop.id, stop]),
            );

            return Array.from(new Set(ids))
                .map((id) => lightStopsById.get(id))
                .filter(
                    (stop): stop is StopGraphQLRecord => stop !== undefined,
                );
        }

        const stopsById = await loadCachedBatch({
            cacheManager: this.cacheManager,
            getCacheKey: CACHE_KEYS.stop.getGraphQLById,
            keys: ids,
            loadMissing: async (missingIds) =>
                this.loadGraphQLStopsByIds(missingIds, options),
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
        hydrateFields,
    }: {
        latitude: number;
        longitude: number;
        limit: number;
        hydrateFields?: boolean;
    }): Promise<StopWithDistanceGraphQLRecord[]> {
        const closestStops = await this.stopRepository.findClosestStops({
            latitude,
            longitude,
            limit,
        });
        const orderedIds = closestStops.map(({ id }) => id);
        const distanceById = new Map(
            closestStops.map(({ id, distance }) => [id, distance]),
        );
        const stops =
            hydrateFields === false
                ? toLightGraphQLStops(
                      await this.loadStopRows({
                          ids: orderedIds,
                      }),
                  )
                : await this.getGraphQLByIds(
                      orderedIds,
                      hydrateFields === undefined
                          ? {}
                          : {
                                hydrateFields,
                            },
                  );
        const stopsById = new Map(stops.map((stop) => [stop.id, stop]));

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
