import type { Cache } from "@nestjs/cache-manager";

import type { DatabaseService } from "src/modules/database/database.service";
import { PlatformService } from "src/modules/platform/platform.service";

type PlatformRow = {
    id: string;
    latitude: number;
    longitude: number;
    name: string;
    isMetro: boolean;
    stopId: string;
    code: string | null;
    direction: string | null;
};

type RouteRow = {
    platformId: string;
    routeId: string;
    routeName: string;
    routeColor: string | null;
    routeFeedId: string;
};

type BuilderCalls = {
    whereCalls: Array<[string, string, unknown]>;
};

const makePlatformBuilder = (rows: PlatformRow[]): BuilderCalls => {
    const calls: BuilderCalls = { whereCalls: [] };
    const builder: Record<string, jest.Mock> = {};
    builder.select = jest.fn(() => builder);
    builder.where = jest.fn((column: string, op: string, value: unknown) => {
        calls.whereCalls.push([column, op, value]);
        return builder;
    });
    builder.orderBy = jest.fn(() => builder);
    builder.execute = jest.fn(async () => rows);
    builder.__instance = jest.fn(() => builder);
    Object.defineProperty(calls, "__builder", { value: builder });
    return calls;
};

const createService = ({
    platformRows = [] as PlatformRow[],
    routeRows = [] as RouteRow[],
}: { platformRows?: PlatformRow[]; routeRows?: RouteRow[] } = {}) => {
    const platformBuilder = makePlatformBuilder(platformRows);
    const routesBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        execute: jest.fn(async () => routeRows),
    };

    const selectFrom = jest.fn((table: string) => {
        if (table === "Platform") {
            return (platformBuilder as unknown as { __builder: unknown })
                .__builder;
        }
        if (table === "PlatformsOnRoutes") {
            return routesBuilder;
        }
        throw new Error(`Unexpected selectFrom(${table})`);
    });

    const database = { db: { selectFrom } } as unknown as DatabaseService;

    const cacheStore = new Map<string, unknown>();
    const cacheManager = {
        wrap: jest.fn(async (_key: string, callback: () => unknown) =>
            callback(),
        ),
        mget: jest.fn(async (keys: string[]) =>
            keys.map((key) =>
                cacheStore.has(key) ? cacheStore.get(key) : undefined,
            ),
        ),
        mset: jest.fn(
            async (entries: Array<{ key: string; value: unknown }>) => {
                for (const entry of entries) {
                    cacheStore.set(entry.key, entry.value);
                }
            },
        ),
        get: jest.fn(async () => undefined),
        set: jest.fn(async () => undefined),
    } as unknown as Cache;

    const service = new PlatformService(database, cacheManager);

    return {
        service,
        cacheManager,
        cacheStore,
        platformBuilder,
        routesBuilder,
    };
};

const samplePlatform = (id: string, isMetro: boolean): PlatformRow => ({
    id,
    latitude: 50,
    longitude: 14,
    name: `Platform ${id}`,
    isMetro,
    stopId: `S-${id}`,
    code: null,
    direction: null,
});

describe("PlatformService", () => {
    describe("getAll", () => {
        it("attaches an empty routes array to every platform", async () => {
            const { service } = createService({
                platformRows: [
                    samplePlatform("P1", false),
                    samplePlatform("P2", true),
                ],
            });

            const result = await service.getAll({ metroOnly: false });

            expect(result).toHaveLength(2);
            expect(result[0]?.routes).toEqual([]);
            expect(result[1]?.routes).toEqual([]);
        });

        it("attaches routes per platform when present", async () => {
            const { service } = createService({
                platformRows: [samplePlatform("P1", false)],
                routeRows: [
                    {
                        platformId: "P1",
                        routeId: "R1",
                        routeName: "1",
                        routeColor: "#ff0000",
                        routeFeedId: "pid",
                    },
                ],
            });

            const result = await service.getAll({ metroOnly: false });

            expect(result[0]?.routes).toEqual([
                {
                    id: "R1",
                    name: "1",
                    color: "#ff0000",
                    feed: "pid",
                },
            ]);
        });

        it("applies metroOnly filter to the platform query", async () => {
            const { service, platformBuilder } = createService({
                platformRows: [samplePlatform("M1", true)],
            });

            await service.getAll({ metroOnly: true });

            expect(platformBuilder.whereCalls).toContainEqual([
                "isMetro",
                "=",
                true,
            ]);
        });
    });

    describe("getPlatformsInBoundingBox", () => {
        it("applies the bounding box as four range constraints", async () => {
            const { service, platformBuilder } = createService();

            await service.getPlatformsInBoundingBox({
                boundingBox: {
                    latitude: [50, 51],
                    longitude: [14, 15],
                },
                metroOnly: false,
            });

            const columns = platformBuilder.whereCalls.map(([col]) => col);
            expect(columns).toEqual(
                expect.arrayContaining([
                    "latitude",
                    "latitude",
                    "longitude",
                    "longitude",
                ]),
            );
        });
    });

    describe("getAllGraphQL", () => {
        it("returns rows without routes and goes through the cache wrapper", async () => {
            const { service, cacheManager } = createService({
                platformRows: [samplePlatform("P1", false)],
            });

            const result = await service.getAllGraphQL({ metroOnly: false });

            expect(result).toHaveLength(1);
            expect(result[0]).not.toHaveProperty("routes");
            expect(cacheManager.wrap).toHaveBeenCalledTimes(1);
        });
    });

    describe("getGraphQLByIds", () => {
        it("loads missing ids, caches results, and returns them in input order without duplicates", async () => {
            const rows = [samplePlatform("P1", false), samplePlatform("P2", true)];
            const { service, cacheManager } = createService({
                platformRows: rows,
            });

            const result = await service.getGraphQLByIds(["P1", "P2", "P1"]);

            expect(result.map((row) => row.id)).toEqual(["P1", "P2"]);
            expect(cacheManager.mget).toHaveBeenCalledTimes(1);
            expect(cacheManager.mset).toHaveBeenCalledTimes(1);
        });

        it("filters out platforms whose cached value is explicitly null", async () => {
            const { service, cacheStore, cacheManager } = createService();
            const cacheKeyP1 = (
                await import("src/constants/cache")
            ).CACHE_KEYS.platform.getGraphQLById("P1");
            cacheStore.set(cacheKeyP1, null);

            const result = await service.getGraphQLByIds(["P1"]);

            expect(result).toEqual([]);
            expect(cacheManager.mset).not.toHaveBeenCalled();
        });
    });

    describe("getOneById", () => {
        it("returns null when no platform matches", async () => {
            const { service } = createService({ platformRows: [] });

            const result = await service.getOneById("missing");

            expect(result).toBeNull();
        });

        it("returns the platform with its routes attached", async () => {
            const { service } = createService({
                platformRows: [samplePlatform("P1", false)],
                routeRows: [
                    {
                        platformId: "P1",
                        routeId: "R1",
                        routeName: "1",
                        routeColor: null,
                        routeFeedId: "pid",
                    },
                ],
            });

            const result = await service.getOneById("P1");

            expect(result).toMatchObject({
                id: "P1",
                routes: [{ id: "R1", name: "1", color: null, feed: "pid" }],
            });
        });
    });
});
