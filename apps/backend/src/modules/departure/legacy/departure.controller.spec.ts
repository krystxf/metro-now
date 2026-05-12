import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";

import { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";
import { DepartureServiceV1 } from "src/modules/departure/legacy/departure-v1.service";
import { DepartureController } from "src/modules/departure/legacy/departure.controller";

const departure = {
    id: "D1",
    departure: {
        predicted: "2026-01-01T10:00:00.000Z",
        scheduled: "2026-01-01T10:00:00.000Z",
    },
    delay: 0,
    headsign: "Můstek",
    route: "A",
    routeId: "L991",
    platformCode: "1",
    platformId: "P1",
    isRealtime: true,
};

describe("DepartureController", () => {
    const departureServiceV1 = {
        getDepartures: jest.fn(),
    };
    const departureServiceV2 = {
        getDepartures: jest.fn(),
    };

    const createController = async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CacheModule.register()],
            controllers: [DepartureController],
            providers: [
                {
                    provide: DepartureServiceV1,
                    useValue: departureServiceV1,
                },
                {
                    provide: DepartureServiceV2,
                    useValue: departureServiceV2,
                },
            ],
        }).compile();

        return moduleRef.get(DepartureController);
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("validates and forwards v1 departure queries", async () => {
        departureServiceV1.getDepartures.mockResolvedValue([departure]);
        const controller = await createController();

        await expect(
            controller.getDeparturesV1({ stop: ["U1"], metroOnly: "true" }),
        ).resolves.toEqual([departure]);
        expect(departureServiceV1.getDepartures).toHaveBeenCalledWith({
            stopIds: ["U1"],
            platformIds: [],
            metroOnly: true,
        });

        await expect(controller.getDeparturesV1({})).rejects.toThrow(
            "At least one platform or stop ID must be provided",
        );
    });

    it("validates and forwards v2 departure queries with defaults", async () => {
        departureServiceV2.getDepartures.mockResolvedValue([departure]);
        const controller = await createController();

        await expect(
            controller.getDeparturesV2({
                platform: ["P1"],
                vehicleType: "metro",
            }),
        ).resolves.toEqual([departure]);
        expect(departureServiceV2.getDepartures).toHaveBeenCalledWith({
            stopIds: [],
            platformIds: ["P1"],
            vehicleType: "metro",
            excludeVehicleType: null,
            limit: null,
            totalLimit: null,
            minutesBefore: 0,
            minutesAfter: 120,
        });

        await expect(
            controller.getDeparturesV2({
                stop: ["U1"],
                vehicleType: "invalid",
            }),
        ).rejects.toThrow("Invalid query params");
    });
});
