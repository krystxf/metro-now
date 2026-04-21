import { RouteByIdLoader } from "src/modules/dataloader/route-by-id.loader";
import type { RouteService } from "src/modules/route/route.service";

describe("RouteByIdLoader", () => {
    it("maps public IDs back to requested lookup IDs", async () => {
        const routeService = {
            getGraphQLByIds: jest
                .fn()
                .mockResolvedValue([{ id: "991" }, { id: "LTL:leo-1" }]),
        } as unknown as jest.Mocked<RouteService>;
        const loader = new RouteByIdLoader(routeService);

        await expect(
            Promise.all([
                loader.load("L991"),
                loader.load("LTL:leo-1"),
                loader.load("L404"),
            ]),
        ).resolves.toEqual([{ id: "991" }, { id: "LTL:leo-1" }, null]);
        expect(routeService.getGraphQLByIds).toHaveBeenCalledWith([
            "L991",
            "LTL:leo-1",
            "L404",
        ]);
    });
});
