import { Open as unzipperOpen } from "unzipper";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import type { Cache } from "cache-manager";

import { CACHE_KEYS, CACHE_TTL } from "src/constants/cache";
import { buildLeoCatalogFromCsv } from "src/modules/leo/leo-gtfs.parser";
import type {
    LeoCatalog,
    LeoPlatform,
    LeoRoute,
    LeoStop,
} from "src/modules/leo/leo.types";

const LEO_GTFS_ARCHIVE_URL =
    "https://www.zsr.sk/files/pre-cestujucich/cestovny-poriadok/gtfs/gtfs.zip";

@Injectable()
export class LeoGtfsService {
    constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

    async getCatalog(): Promise<LeoCatalog> {
        return this.cacheManager.wrap(
            CACHE_KEYS.leo.getCatalog,
            async () => {
                const response = await fetch(LEO_GTFS_ARCHIVE_URL);

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch Leo GTFS archive: ${response.status} ${response.statusText}`,
                    );
                }

                const directory = await unzipperOpen.buffer(
                    Buffer.from(await response.arrayBuffer()),
                );
                const getFile = (path: string): Promise<string> => {
                    const file = directory.files.find(
                        (entry) => entry.path === path,
                    );

                    if (!file) {
                        throw new Error(
                            `Leo GTFS archive is missing '${path}'`,
                        );
                    }

                    return file.buffer().then((buffer) => buffer.toString());
                };

                return buildLeoCatalogFromCsv({
                    agenciesCsv: await getFile("agency.txt"),
                    routesCsv: await getFile("routes.txt"),
                    stopsCsv: await getFile("stops.txt"),
                    stopTimesCsv: await getFile("stop_times.txt"),
                    tripsCsv: await getFile("trips.txt"),
                });
            },
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
