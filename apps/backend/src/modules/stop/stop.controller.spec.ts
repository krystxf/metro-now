import { Test } from "@nestjs/testing";

import { StopController } from "src/modules/stop/stop.controller";
import { StopService } from "src/modules/stop/stop.service";

describe("StopController", () => {
    const stopService = {
        getAll: jest.fn(),
        getOneById: jest.fn(),
    };

    const createController = async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [StopController],
            providers: [
                {
                    provide: StopService,
                    useValue: stopService,
                },
            ],
        }).compile();

        return moduleRef.get(StopController);
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("parses metroOnly and railOnly flags for all-stops requests", async () => {
        stopService.getAll.mockResolvedValue([{ id: "U1" }]);
        const controller = await createController();

        await expect(controller.getAllStopsV1("true", "true")).resolves.toEqual(
            [{ id: "U1" }],
        );
        expect(stopService.getAll).toHaveBeenCalledWith({
            metroOnly: true,
            railOnly: false,
        });
    });

    it("returns a stop by ID", async () => {
        stopService.getOneById.mockResolvedValue({ id: "U1" });
        const controller = await createController();

        await expect(controller.getStopByIdV1("U1")).resolves.toEqual({
            id: "U1",
        });
    });

    it("throws when the stop does not exist", async () => {
        stopService.getOneById.mockResolvedValue(null);
        const controller = await createController();

        await expect(controller.getStopByIdV1("UNKNOWN")).rejects.toThrow(
            "Stop ID not found",
        );
    });
});
