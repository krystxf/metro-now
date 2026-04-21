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
});
