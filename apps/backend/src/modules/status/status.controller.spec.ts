import { Test } from "@nestjs/testing";

import { StatusController } from "src/modules/status/status.controller";
import { StatusService } from "src/modules/status/status.service";
import {
    SystemStatus,
    SystemStatusService,
} from "src/modules/status/status.types";

describe("StatusController", () => {
    const statusService = {
        getBackendStatus: jest.fn(),
        getGeoFunctionsStatus: jest.fn(),
        getDbDataStatus: jest.fn(),
    };

    const createController = async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [StatusController],
            providers: [
                {
                    provide: StatusService,
                    useValue: statusService,
                },
            ],
        }).compile();

        return moduleRef.get(StatusController);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        statusService.getBackendStatus.mockReturnValue({
            service: SystemStatusService.BACKEND,
            status: SystemStatus.OK,
        });
        statusService.getGeoFunctionsStatus.mockResolvedValue({
            service: SystemStatusService.GEO_FUNCTIONS,
            status: SystemStatus.OK,
        });
        statusService.getDbDataStatus.mockResolvedValue({
            service: SystemStatusService.DB_DATA,
            status: SystemStatus.OK,
        });
    });

    it("aggregates backend, geo, and database statuses", async () => {
        const controller = await createController();

        await expect(controller.getBackendStatus()).resolves.toEqual([
            {
                service: SystemStatusService.BACKEND,
                status: SystemStatus.OK,
            },
            {
                service: SystemStatusService.GEO_FUNCTIONS,
                status: SystemStatus.OK,
            },
            {
                service: SystemStatusService.DB_DATA,
                status: SystemStatus.OK,
            },
        ]);
    });

    it("fails health sub-endpoints when the underlying status is not OK", async () => {
        statusService.getGeoFunctionsStatus.mockResolvedValueOnce({
            service: SystemStatusService.GEO_FUNCTIONS,
            status: SystemStatus.ERROR,
        });
        statusService.getDbDataStatus.mockResolvedValueOnce({
            service: SystemStatusService.DB_DATA,
            status: SystemStatus.ERROR,
        });
        const controller = await createController();

        await expect(controller.getPlatformsByDistance()).rejects.toThrow(
            "Geo functions status is not OK",
        );
        await expect(controller.getDbDataStatus()).rejects.toThrow(
            "DB data status is not OK",
        );
    });
});
