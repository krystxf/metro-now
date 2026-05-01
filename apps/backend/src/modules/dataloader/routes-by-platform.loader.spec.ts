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
});
