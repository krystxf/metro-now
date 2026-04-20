import type { GraphQLResolveInfo } from "graphql";
import type { PlatformsByStopLoader } from "src/modules/dataloader/platforms-by-stop.loader";
import {
    StopResolver,
    StopWithDistanceResolver,
} from "src/modules/stop/stop.resolver";
import type { StopService } from "src/modules/stop/stop.service";

const createInfo = (fieldNames: string[]): GraphQLResolveInfo =>
    ({
        fieldNodes: [
            {
                kind: "Field",
                name: {
                    kind: "Name",
                    value: "stops",
                },
                selectionSet: {
                    kind: "SelectionSet",
                    selections: fieldNames.map((fieldName) => ({
                        kind: "Field",
                        name: {
                            kind: "Name",
                            value: fieldName,
                        },
                    })),
                },
            },
        ],
        fragments: {},
    }) as unknown as GraphQLResolveInfo;

const createMocks = () => {
    const stopService = {
        getGraphQLByIds: jest.fn(),
        getAllGraphQL: jest.fn(),
        searchGraphQL: jest.fn(),
        getClosestStopsGraphQL: jest.fn(),
        getDataLastUpdatedAt: jest.fn(),
    } as unknown as jest.Mocked<StopService>;

    const platformsByStopLoader = {
        loadMany: jest.fn(),
    } as unknown as jest.Mocked<PlatformsByStopLoader>;

    const resolver = new StopResolver(
        stopService,
        platformsByStopLoader as unknown as PlatformsByStopLoader,
    );

    return { resolver, stopService, platformsByStopLoader };
};

describe("StopResolver", () => {
    describe("getOne", () => {
        it("returns a stop by ID", async () => {
            const { resolver, stopService } = createMocks();
            const stop = {
                id: "U1072",
                feed: "PID" as const,
                name: "Můstek",
                avgLatitude: 50.08,
                avgLongitude: 14.42,
                platforms: [],
                entrances: [],
                isMetro: false,
                vehicleTypes: [],
            };

            stopService.getGraphQLByIds.mockResolvedValue([stop]);

            const result = await resolver.getOne("U1072");

            expect(stopService.getGraphQLByIds).toHaveBeenCalledWith(
                ["U1072"],
                {
                    hydrateFields: true,
                },
            );
            expect(result).toEqual(stop);
        });

        it("returns null when stop is not found", async () => {
            const { resolver, stopService } = createMocks();

            stopService.getGraphQLByIds.mockResolvedValue([]);

            const result = await resolver.getOne("nonexistent");

            expect(result).toBeNull();
        });
    });

    describe("getMultiple", () => {
        it("fetches stops by IDs when provided", async () => {
            const { resolver, stopService } = createMocks();
            const stops = [
                {
                    id: "U1072",
                    feed: "PID" as const,
                    name: "Můstek",
                    avgLatitude: 50.08,
                    avgLongitude: 14.42,
                    platforms: [],
                    entrances: [],
                    isMetro: false,
                    vehicleTypes: [],
                },
            ];

            stopService.getGraphQLByIds.mockResolvedValue(stops);

            const result = await resolver.getMultiple(
                ["U1072"],
                undefined,
                undefined,
            );

            expect(stopService.getGraphQLByIds).toHaveBeenCalledWith(
                ["U1072"],
                {
                    hydrateFields: true,
                },
            );
            expect(result).toEqual(stops);
        });

        it("applies limit and offset when fetching by IDs", async () => {
            const { resolver, stopService } = createMocks();
            const stops = [
                {
                    id: "S1",
                    feed: "PID" as const,
                    name: "A",
                    avgLatitude: 50,
                    avgLongitude: 14,
                    platforms: [],
                    entrances: [],
                    isMetro: false,
                    vehicleTypes: [],
                },
                {
                    id: "S2",
                    feed: "PID" as const,
                    name: "B",
                    avgLatitude: 50.1,
                    avgLongitude: 14.1,
                    platforms: [],
                    entrances: [],
                    isMetro: false,
                    vehicleTypes: [],
                },
                {
                    id: "S3",
                    feed: "PID" as const,
                    name: "C",
                    avgLatitude: 50.2,
                    avgLongitude: 14.2,
                    platforms: [],
                    entrances: [],
                    isMetro: false,
                    vehicleTypes: [],
                },
            ];

            stopService.getGraphQLByIds.mockResolvedValue(stops);

            const result = await resolver.getMultiple(["S1", "S2", "S3"], 1, 1);

            expect(result).toEqual([stops[1]]);
        });

        it("fetches all stops when no IDs provided", async () => {
            const { resolver, stopService } = createMocks();
            const stops = [
                {
                    id: "U1",
                    feed: "PID" as const,
                    name: "Stop",
                    avgLatitude: 50,
                    avgLongitude: 14,
                    platforms: [],
                    entrances: [],
                    isMetro: false,
                    vehicleTypes: [],
                },
            ];

            stopService.getAllGraphQL.mockResolvedValue(stops);

            const result = await resolver.getMultiple(undefined, 10, undefined);

            expect(stopService.getAllGraphQL).toHaveBeenCalledWith({
                hydrateFields: true,
                limit: 10,
            });
            expect(result).toEqual(stops);
        });

        it("fetches all stops when IDs array is empty", async () => {
            const { resolver, stopService } = createMocks();

            stopService.getAllGraphQL.mockResolvedValue([]);

            await resolver.getMultiple([], undefined, undefined);

            expect(stopService.getAllGraphQL).toHaveBeenCalled();
            expect(stopService.getGraphQLByIds).not.toHaveBeenCalled();
        });

        it("skips stop hydration when only base fields are requested", async () => {
            const { resolver, stopService } = createMocks();

            stopService.getAllGraphQL.mockResolvedValue([]);

            await resolver.getMultiple(
                undefined,
                10,
                undefined,
                createInfo(["id", "name"]),
            );

            expect(stopService.getAllGraphQL).toHaveBeenCalledWith({
                hydrateFields: false,
                limit: 10,
            });
        });
    });

    describe("getPlatformsField", () => {
        it("loads platforms by their IDs", () => {
            const { resolver, platformsByStopLoader } = createMocks();

            platformsByStopLoader.loadMany.mockResolvedValue([]);

            resolver.getPlatformsField({
                platforms: [{ id: "P1" }, { id: "P2" }],
            } as never);

            expect(platformsByStopLoader.loadMany).toHaveBeenCalledWith([
                "P1",
                "P2",
            ]);
        });
    });

    describe("search", () => {
        it("delegates stop-name search to the service", async () => {
            const { resolver, stopService } = createMocks();
            const stops = [
                {
                    id: "U1072",
                    feed: "PID" as const,
                    name: "Václavské náměstí",
                    avgLatitude: 50.08,
                    avgLongitude: 14.42,
                    platforms: [],
                    entrances: [],
                    isMetro: false,
                    vehicleTypes: [],
                },
            ];

            stopService.searchGraphQL.mockResolvedValue(stops);

            const result = await resolver.search(
                "václav",
                10,
                5,
                undefined,
                undefined,
            );

            expect(stopService.searchGraphQL).toHaveBeenCalledWith({
                hydrateFields: true,
                query: "václav",
                limit: 10,
                offset: 5,
            });
            expect(result).toEqual(stops);
        });

        it("forwards optional coordinates when both are provided", async () => {
            const { resolver, stopService } = createMocks();
            stopService.searchGraphQL.mockResolvedValue([]);

            await resolver.search("václav", undefined, undefined, 50.08, 14.42);

            expect(stopService.searchGraphQL).toHaveBeenCalledWith({
                hydrateFields: true,
                query: "václav",
                latitude: 50.08,
                longitude: 14.42,
            });
        });

        it("ignores coordinates when only one of lat/lon is provided", async () => {
            const { resolver, stopService } = createMocks();
            stopService.searchGraphQL.mockResolvedValue([]);

            await resolver.search(
                "václav",
                undefined,
                undefined,
                50.08,
                undefined,
            );

            expect(stopService.searchGraphQL).toHaveBeenCalledWith({
                hydrateFields: true,
                query: "václav",
            });
        });
    });

    describe("getClosest", () => {
        it("delegates to the service with the provided coordinates", async () => {
            const { resolver, stopService } = createMocks();
            const stops = [
                {
                    id: "U1072",
                    feed: "PID" as const,
                    name: "Můstek",
                    avgLatitude: 50.08,
                    avgLongitude: 14.42,
                    platforms: [],
                    entrances: [],
                    isMetro: false,
                    vehicleTypes: [],
                    distance: 120,
                },
            ];

            stopService.getClosestStopsGraphQL.mockResolvedValue(stops);

            const result = await resolver.getClosest(50.08, 14.42, 10);

            expect(stopService.getClosestStopsGraphQL).toHaveBeenCalledWith({
                hydrateFields: true,
                latitude: 50.08,
                longitude: 14.42,
                limit: 10,
            });
            expect(result).toEqual(stops);
        });

        it("defaults the limit to 100 when not provided", async () => {
            const { resolver, stopService } = createMocks();
            stopService.getClosestStopsGraphQL.mockResolvedValue([]);

            await resolver.getClosest(50, 14, undefined);

            expect(stopService.getClosestStopsGraphQL).toHaveBeenCalledWith({
                hydrateFields: true,
                latitude: 50,
                longitude: 14,
                limit: 100,
            });
        });

        it("caps the limit at 100", async () => {
            const { resolver, stopService } = createMocks();
            stopService.getClosestStopsGraphQL.mockResolvedValue([]);

            await resolver.getClosest(50, 14, 500);

            expect(stopService.getClosestStopsGraphQL).toHaveBeenCalledWith({
                hydrateFields: true,
                latitude: 50,
                longitude: 14,
                limit: 100,
            });
        });

        it("clamps non-positive limits to 1", async () => {
            const { resolver, stopService } = createMocks();
            stopService.getClosestStopsGraphQL.mockResolvedValue([]);

            await resolver.getClosest(50, 14, 0);

            expect(stopService.getClosestStopsGraphQL).toHaveBeenCalledWith({
                hydrateFields: true,
                latitude: 50,
                longitude: 14,
                limit: 1,
            });
        });
    });

    describe("getDataLastUpdatedAt", () => {
        it("delegates stop/platform freshness lookup to the service", async () => {
            const { resolver, stopService } = createMocks();

            stopService.getDataLastUpdatedAt.mockResolvedValue(
                "2026-04-11T09:30:00.000Z",
            );

            const result = await resolver.getDataLastUpdatedAt();

            expect(stopService.getDataLastUpdatedAt).toHaveBeenCalledTimes(1);
            expect(result).toBe("2026-04-11T09:30:00.000Z");
        });
    });
});

describe("StopWithDistanceResolver", () => {
    it("loads platforms by their IDs", () => {
        const platformsByStopLoader = {
            loadMany: jest.fn(),
        } as unknown as jest.Mocked<PlatformsByStopLoader>;
        const resolver = new StopWithDistanceResolver(
            platformsByStopLoader as unknown as PlatformsByStopLoader,
        );

        platformsByStopLoader.loadMany.mockResolvedValue([]);

        resolver.getPlatformsField({
            platforms: [{ id: "P1" }, { id: "P2" }],
        });

        expect(platformsByStopLoader.loadMany).toHaveBeenCalledWith([
            "P1",
            "P2",
        ]);
    });
});
