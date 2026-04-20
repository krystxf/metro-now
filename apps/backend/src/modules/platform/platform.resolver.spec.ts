import type { RoutesByPlatformIdLoader } from "src/modules/dataloader/routes-by-platform.loader";
import type { StopByPlatformLoader } from "src/modules/dataloader/stop-by-platform.loader";
import { PlatformResolver } from "src/modules/platform/platform.resolver";
import type { PlatformService } from "src/modules/platform/platform.service";

const createMocks = () => {
    const platformService = {
        getOneById: jest.fn(),
        getAllGraphQL: jest.fn(),
        getGraphQLByIds: jest.fn(),
    } as unknown as jest.Mocked<PlatformService>;

    const routesByPlatformIdLoader = {
        load: jest.fn(),
    } as unknown as jest.Mocked<RoutesByPlatformIdLoader>;

    const stopByPlatformLoader = {
        load: jest.fn(),
    } as unknown as jest.Mocked<StopByPlatformLoader>;

    const resolver = new PlatformResolver(
        platformService,
        routesByPlatformIdLoader as unknown as RoutesByPlatformIdLoader,
        stopByPlatformLoader as unknown as StopByPlatformLoader,
    );

    return {
        resolver,
        platformService,
        routesByPlatformIdLoader,
        stopByPlatformLoader,
    };
};

describe("PlatformResolver", () => {
    describe("getOne", () => {
        it("returns a platform by ID", () => {
            const { resolver, platformService } = createMocks();
            const platform = {
                id: "U1072Z101P",
                name: "Můstek",
                code: "1",
                direction: null,
                isMetro: true,
                latitude: 50.08,
                longitude: 14.42,
                stopId: "U1072",
                routes: [],
            };

            platformService.getOneById.mockResolvedValue(platform);

            resolver.getOne("U1072Z101P");

            expect(platformService.getOneById).toHaveBeenCalledWith(
                "U1072Z101P",
            );
        });
    });

    describe("getMultiple", () => {
        it("fetches platforms by IDs when provided", () => {
            const { resolver, platformService } = createMocks();

            platformService.getGraphQLByIds.mockResolvedValue([]);

            resolver.getMultiple(["P1", "P2"]);

            expect(platformService.getGraphQLByIds).toHaveBeenCalledWith([
                "P1",
                "P2",
            ]);
        });

        it("fetches all platforms when IDs is undefined", () => {
            const { resolver, platformService } = createMocks();

            platformService.getAllGraphQL.mockResolvedValue([]);

            resolver.getMultiple(undefined);

            expect(platformService.getAllGraphQL).toHaveBeenCalledWith({
                metroOnly: false,
            });
        });

        it("fetches all platforms when IDs is empty", () => {
            const { resolver, platformService } = createMocks();

            platformService.getAllGraphQL.mockResolvedValue([]);

            resolver.getMultiple([]);

            expect(platformService.getAllGraphQL).toHaveBeenCalledWith({
                metroOnly: false,
            });
            expect(platformService.getGraphQLByIds).not.toHaveBeenCalled();
        });
    });

    describe("getStopField", () => {
        it("loads the stop for a platform with stopId", () => {
            const { resolver, stopByPlatformLoader } = createMocks();

            stopByPlatformLoader.load.mockResolvedValue({
                id: "U1072",
            } as never);

            resolver.getStopField({ stopId: "U1072", id: "P1" } as never);

            expect(stopByPlatformLoader.load).toHaveBeenCalledWith("U1072");
        });

        it("returns null when platform has no stopId", () => {
            const { resolver, stopByPlatformLoader } = createMocks();

            const result = resolver.getStopField({
                stopId: null,
                id: "P1",
            } as never);

            expect(result).toBeNull();
            expect(stopByPlatformLoader.load).not.toHaveBeenCalled();
        });
    });

    describe("getRoutesField", () => {
        it("loads routes by platform ID", () => {
            const { resolver, routesByPlatformIdLoader } = createMocks();

            routesByPlatformIdLoader.load.mockResolvedValue([] as never);

            resolver.getRoutesField({ id: "P1" } as never);

            expect(routesByPlatformIdLoader.load).toHaveBeenCalledWith("P1");
        });
    });
});
