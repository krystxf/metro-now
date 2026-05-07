import { PlatformsByStopLoader } from "src/modules/dataloader/platforms-by-stop.loader";
import type { PlatformService } from "src/modules/platform/platform.service";

describe("PlatformsByStopLoader", () => {
    it("returns results in the same order as the requested IDs", async () => {
        const platformService = {
            getGraphQLByIds: jest
                .fn()
                .mockResolvedValue([{ id: "P2" }, { id: "P1" }]),
        } as unknown as jest.Mocked<PlatformService>;
        const loader = new PlatformsByStopLoader(platformService);

        await expect(
            Promise.all([
                loader.load("P1"),
                loader.load("MISSING"),
                loader.load("P2"),
            ]),
        ).resolves.toEqual([{ id: "P1" }, null, { id: "P2" }]);
        expect(platformService.getGraphQLByIds).toHaveBeenCalledWith([
            "P1",
            "MISSING",
            "P2",
        ]);
    });

    it("returns null for all IDs when service returns empty array", async () => {
        const platformService = {
            getGraphQLByIds: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<PlatformService>;
        const loader = new PlatformsByStopLoader(platformService);

        await expect(
            Promise.all([loader.load("P1"), loader.load("P2")]),
        ).resolves.toEqual([null, null]);
    });

    it("returns all results when every requested ID is found", async () => {
        const platformService = {
            getGraphQLByIds: jest
                .fn()
                .mockResolvedValue([{ id: "P1" }, { id: "P2" }, { id: "P3" }]),
        } as unknown as jest.Mocked<PlatformService>;
        const loader = new PlatformsByStopLoader(platformService);

        await expect(
            Promise.all([
                loader.load("P1"),
                loader.load("P2"),
                loader.load("P3"),
            ]),
        ).resolves.toEqual([{ id: "P1" }, { id: "P2" }, { id: "P3" }]);
    });

    it("resolves a single requested ID", async () => {
        const platformService = {
            getGraphQLByIds: jest.fn().mockResolvedValue([{ id: "P1" }]),
        } as unknown as jest.Mocked<PlatformService>;
        const loader = new PlatformsByStopLoader(platformService);

        await expect(loader.load("P1")).resolves.toEqual({ id: "P1" });
        expect(platformService.getGraphQLByIds).toHaveBeenCalledWith(["P1"]);
    });

    it("deduplicates repeated IDs and resolves both to the same record", async () => {
        const platformService = {
            getGraphQLByIds: jest.fn().mockResolvedValue([{ id: "P1" }]),
        } as unknown as jest.Mocked<PlatformService>;
        const loader = new PlatformsByStopLoader(platformService);

        const [first, second] = await Promise.all([
            loader.load("P1"),
            loader.load("P1"),
        ]);
        expect(first).toEqual({ id: "P1" });
        expect(second).toEqual({ id: "P1" });
        expect(platformService.getGraphQLByIds).toHaveBeenCalledTimes(1);
    });
});
