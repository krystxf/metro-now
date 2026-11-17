import { StopByPlatformLoader } from "src/modules/dataloader/stop-by-platform.loader";
import type { StopService } from "src/modules/stop/stop.service";

describe("StopByPlatformLoader", () => {
    it("returns stops in request order and fills gaps with null", async () => {
        const stopService = {
            getGraphQLByIds: jest
                .fn()
                .mockResolvedValue([{ id: "S2" }, { id: "S1" }]),
        } as unknown as jest.Mocked<StopService>;
        const loader = new StopByPlatformLoader(stopService);

        await expect(
            Promise.all([
                loader.load("S1"),
                loader.load("MISSING"),
                loader.load("S2"),
            ]),
        ).resolves.toEqual([{ id: "S1" }, null, { id: "S2" }]);
        expect(stopService.getGraphQLByIds).toHaveBeenCalledWith([
            "S1",
            "MISSING",
            "S2",
        ]);
    });

    it("returns null for all IDs when service returns empty array", async () => {
        const stopService = {
            getGraphQLByIds: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<StopService>;
        const loader = new StopByPlatformLoader(stopService);

        await expect(
            Promise.all([loader.load("S1"), loader.load("S2")]),
        ).resolves.toEqual([null, null]);
    });

    it("returns all stops when every requested ID is found", async () => {
        const stopService = {
            getGraphQLByIds: jest
                .fn()
                .mockResolvedValue([{ id: "S1" }, { id: "S2" }, { id: "S3" }]),
        } as unknown as jest.Mocked<StopService>;
        const loader = new StopByPlatformLoader(stopService);

        await expect(
            Promise.all([
                loader.load("S1"),
                loader.load("S2"),
                loader.load("S3"),
            ]),
        ).resolves.toEqual([{ id: "S1" }, { id: "S2" }, { id: "S3" }]);
    });

    it("resolves a single requested ID", async () => {
        const stopService = {
            getGraphQLByIds: jest.fn().mockResolvedValue([{ id: "S1" }]),
        } as unknown as jest.Mocked<StopService>;
        const loader = new StopByPlatformLoader(stopService);

        await expect(loader.load("S1")).resolves.toEqual({ id: "S1" });
        expect(stopService.getGraphQLByIds).toHaveBeenCalledWith(["S1"]);
    });

    it("deduplicates repeated IDs and resolves both to the same stop", async () => {
        const stopService = {
            getGraphQLByIds: jest.fn().mockResolvedValue([{ id: "S1" }]),
        } as unknown as jest.Mocked<StopService>;
        const loader = new StopByPlatformLoader(stopService);

        const [first, second] = await Promise.all([
            loader.load("S1"),
            loader.load("S1"),
        ]);
        expect(first).toEqual({ id: "S1" });
        expect(second).toEqual({ id: "S1" });
        expect(stopService.getGraphQLByIds).toHaveBeenCalledTimes(1);
    });
});
