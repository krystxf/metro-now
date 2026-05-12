import { RoutesByPlatformIdLoader } from "src/modules/dataloader/routes-by-platform.loader";
import type { RouteService } from "src/modules/route/route.service";

describe("RoutesByPlatformIdLoader", () => {
    it("delegates batched platform ID requests to the route service", async () => {
        const routeService = {
            getManyGraphQLByPlatformIds: jest
                .fn()
                .mockResolvedValue([[{ id: "R1" }], []]),
        } as unknown as jest.Mocked<RouteService>;
        const loader = new RoutesByPlatformIdLoader(routeService);

        await expect(
            Promise.all([loader.load("P1"), loader.load("P2")]),
        ).resolves.toEqual([[{ id: "R1" }], []]);
        expect(routeService.getManyGraphQLByPlatformIds).toHaveBeenCalledWith([
            "P1",
            "P2",
        ]);
    });

    it("returns empty arrays for all platforms when service returns no routes", async () => {
        const routeService = {
            getManyGraphQLByPlatformIds: jest
                .fn()
                .mockResolvedValue([[], [], []]),
        } as unknown as jest.Mocked<RouteService>;
        const loader = new RoutesByPlatformIdLoader(routeService);

        await expect(
            Promise.all([
                loader.load("P1"),
                loader.load("P2"),
                loader.load("P3"),
            ]),
        ).resolves.toEqual([[], [], []]);
    });

    it("returns multiple routes for a single platform", async () => {
        const routes = [{ id: "R1" }, { id: "R2" }, { id: "R3" }];
        const routeService = {
            getManyGraphQLByPlatformIds: jest.fn().mockResolvedValue([routes]),
        } as unknown as jest.Mocked<RouteService>;
        const loader = new RoutesByPlatformIdLoader(routeService);

        await expect(loader.load("P1")).resolves.toEqual(routes);
        expect(routeService.getManyGraphQLByPlatformIds).toHaveBeenCalledWith([
            "P1",
        ]);
    });

    it("passes platform IDs in the order they were requested", async () => {
        const routeService = {
            getManyGraphQLByPlatformIds: jest
                .fn()
                .mockResolvedValue([[{ id: "R-A" }], [{ id: "R-B" }]]),
        } as unknown as jest.Mocked<RouteService>;
        const loader = new RoutesByPlatformIdLoader(routeService);

        const [resultA, resultB] = await Promise.all([
            loader.load("PA"),
            loader.load("PB"),
        ]);
        expect(resultA).toEqual([{ id: "R-A" }]);
        expect(resultB).toEqual([{ id: "R-B" }]);
        expect(routeService.getManyGraphQLByPlatformIds).toHaveBeenCalledWith([
            "PA",
            "PB",
        ]);
    });
});
