import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import type { Cache } from "cache-manager";
import { Effect } from "effect";
import { Open as unzipperOpen } from "unzipper";

import { UpstreamError, fetchResponse, runPromise } from "src/common/upstream";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";
import { buildLeoCatalogFromCsv } from "src/modules/leo/leo-gtfs.parser";
import type {
    LeoCatalog,
    LeoPlatform,
    LeoRoute,
    LeoStop,
} from "src/modules/leo/leo.types";

const LEO_GTFS_ARCHIVE_URL =
    "https://data.slovensko.sk/download?id=adf2c0db-600e-45c9-906c-7e441f78472f";

@Injectable()
export class LeoGtfsService {
    constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

    async getCatalog(): Promise<LeoCatalog> {
        return this.cacheManager.wrap(
            CACHE_KEYS.leo.getCatalog,
            () =>
                runPromise(
                    Effect.gen(function* () {
                        const response = yield* fetchResponse(
                            "Leo GTFS",
                            LEO_GTFS_ARCHIVE_URL,
                        );
                        const archive = yield* Effect.tryPromise({
                            try: async () =>
                                Buffer.from(await response.arrayBuffer()),
                            catch: (cause) =>
                                new UpstreamError({
                                    service: "Leo GTFS",
                                    operation: "archive download",
                                    cause,
                                }),
                        });
                        if (
                            archive.subarray(0, 2).toString("latin1") !== "PK"
                        ) {
                            return yield* Effect.fail(
                                new UpstreamError({
                                    service: "Leo GTFS",
                                    operation:
                                        "archive validation (not a ZIP file)",
                                }),
                            );
                        }
                        return yield* Effect.tryPromise({
                            try: async () => {
                                const directory =
                                    await unzipperOpen.buffer(archive);
                                const getFile = async (
                                    path: string,
                                ): Promise<string> => {
                                    const file = directory.files.find(
                                        (entry) => entry.path === path,
                                    );
                                    if (!file)
                                        throw new Error(
                                            `Leo GTFS archive is missing '${path}'`,
                                        );
                                    return (await file.buffer()).toString();
                                };
                                return buildLeoCatalogFromCsv({
                                    agenciesCsv: await getFile("agency.txt"),
                                    routesCsv: await getFile("routes.txt"),
                                    stopsCsv: await getFile("stops.txt"),
                                    stopTimesCsv:
                                        await getFile("stop_times.txt"),
                                    tripsCsv: await getFile("trips.txt"),
                                });
                            },
                            catch: (cause) =>
                                new UpstreamError({
                                    service: "Leo GTFS",
                                    operation: "archive decoding",
                                    cause,
                                }),
                        });
                    }),
                ),
            CACHE_TTL.leoCatalog,
        );
    }

    async getStops(): Promise<LeoStop[]> {
        return (await this.getCatalog()).stops;
    }

    async getStopById(id: string): Promise<LeoStop | null> {
        return (
            (await this.getCatalog()).stops.find((stop) => stop.id === id) ??
            null
        );
    }

    async getPlatformsByIds(ids: readonly string[]): Promise<LeoPlatform[]> {
        const idSet = new Set(ids);

        return (await this.getCatalog()).stops
            .flatMap((stop) => stop.platforms)
            .filter((platform) => idSet.has(platform.id));
    }

    async getPlatformById(id: string): Promise<LeoPlatform | null> {
        return (
            (await this.getCatalog()).stops
                .flatMap((stop) => stop.platforms)
                .find((platform) => platform.id === id) ?? null
        );
    }

    async getRoutes(): Promise<LeoRoute[]> {
        return (await this.getCatalog()).routes;
    }

    async getRouteById(id: string): Promise<LeoRoute | null> {
        return (
            (await this.getCatalog()).routes.find((route) => route.id === id) ??
            null
        );
    }

    async getRoutesByIds(ids: readonly string[]): Promise<LeoRoute[]> {
        const idSet = new Set(ids);

        return (await this.getCatalog()).routes.filter((route) =>
            idSet.has(route.id),
        );
    }

    async getRoutesByPlatformIds(
        platformIds: readonly string[],
    ): Promise<Map<string, LeoRoute[]>> {
        const platformIdSet = new Set(platformIds);
        const routes = await this.getRoutes();
        const routeById = new Map(
            routes.map((route) => [route.id, route] as const),
        );
        const result = new Map<string, LeoRoute[]>(
            platformIds.map((platformId) => [platformId, []]),
        );

        for (const stop of await this.getStops()) {
            for (const platform of stop.platforms) {
                if (!platformIdSet.has(platform.id)) {
                    continue;
                }

                result.set(
                    platform.id,
                    platform.routes
                        .map((route) => routeById.get(route.id))
                        .filter(
                            (route): route is LeoRoute => route !== undefined,
                        ),
                );
            }
        }

        return result;
    }

    async getRouteIdsByShortName(shortName: string): Promise<string[]> {
        return (await this.getCatalog()).routes
            .filter((route) => route.shortName === shortName)
            .map((route) => route.id)
            .sort((left, right) => left.localeCompare(right));
    }
}
