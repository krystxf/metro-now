import type { PlatformsByStopLoader } from "src/modules/dataloader/platforms-by-stop.loader";
import { StopResolver } from "src/modules/stop/stop.resolver";
import type { StopService } from "src/modules/stop/stop.service";

const createMocks = () => {
    const stopService = {
        getGraphQLByIds: jest.fn(),
        getAllGraphQL: jest.fn(),
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
                name: "Můstek",
                avgLatitude: 50.08,
                avgLongitude: 14.42,
                platforms: [],
                entrances: [],
            };

            stopService.getGraphQLByIds.mockResolvedValue([stop]);

            const result = await resolver.getOne("U1072");

            expect(stopService.getGraphQLByIds).toHaveBeenCalledWith(["U1072"]);
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
                    name: "Můstek",
                    avgLatitude: 50.08,
                    avgLongitude: 14.42,
                    platforms: [],
                    entrances: [],
                },
            ];

            stopService.getGraphQLByIds.mockResolvedValue(stops);

            const result = await resolver.getMultiple(
                ["U1072"],
                undefined,
                undefined,
            );

            expect(stopService.getGraphQLByIds).toHaveBeenCalledWith(["U1072"]);
            expect(result).toEqual(stops);
        });

        it("applies limit and offset when fetching by IDs", async () => {
            const { resolver, stopService } = createMocks();
            const stops = [
                {
                    id: "S1",
                    name: "A",
                    avgLatitude: 50,
                    avgLongitude: 14,
                    platforms: [],
                    entrances: [],
                },
                {
                    id: "S2",
                    name: "B",
                    avgLatitude: 50.1,
                    avgLongitude: 14.1,
                    platforms: [],
                    entrances: [],
                },
                {
                    id: "S3",
                    name: "C",
                    avgLatitude: 50.2,
                    avgLongitude: 14.2,
                    platforms: [],
                    entrances: [],
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
                    name: "Stop",
                    avgLatitude: 50,
                    avgLongitude: 14,
                    platforms: [],
                    entrances: [],
                },
            ];

            stopService.getAllGraphQL.mockResolvedValue(stops);

            const result = await resolver.getMultiple(undefined, 10, undefined);

            expect(stopService.getAllGraphQL).toHaveBeenCalledWith({
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
});
