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

    it("returns null for all IDs when service returns empty array", async () => {
        const routeService = {
            getGraphQLByIds: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<RouteService>;
        const loader = new RouteByIdLoader(routeService);

        await expect(
            Promise.all([loader.load("L1"), loader.load("L2")]),
        ).resolves.toEqual([null, null]);
    });

    it("returns all results when every requested ID is found", async () => {
        const routeService = {
            getGraphQLByIds: jest
                .fn()
                .mockResolvedValue([{ id: "1" }, { id: "2" }, { id: "TMB:3" }]),
        } as unknown as jest.Mocked<RouteService>;
        const loader = new RouteByIdLoader(routeService);

        await expect(
            Promise.all([
                loader.load("L1"),
                loader.load("L2"),
                loader.load("TMB:3"),
            ]),
        ).resolves.toEqual([{ id: "1" }, { id: "2" }, { id: "TMB:3" }]);
    });

    it("matches L-prefixed route IDs directly without double-prefixing", async () => {
        const routeService = {
            getGraphQLByIds: jest.fn().mockResolvedValue([{ id: "L-express" }]),
        } as unknown as jest.Mocked<RouteService>;
        const loader = new RouteByIdLoader(routeService);

        // Route id starts with "L", so toLookupRouteId keeps it as-is
        await expect(loader.load("L-express")).resolves.toEqual({
            id: "L-express",
        });
    });

    it("deduplicates repeated IDs and calls service once", async () => {
        const routeService = {
            getGraphQLByIds: jest.fn().mockResolvedValue([{ id: "42" }]),
        } as unknown as jest.Mocked<RouteService>;
        const loader = new RouteByIdLoader(routeService);

        const [first, second] = await Promise.all([
            loader.load("L42"),
            loader.load("L42"),
        ]);
        expect(first).toEqual({ id: "42" });
        expect(second).toEqual({ id: "42" });
        expect(routeService.getGraphQLByIds).toHaveBeenCalledTimes(1);
    });
});
