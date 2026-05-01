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
});
