import { DepartureServiceV1 } from "src/modules/departure/departure-v1.service";
import type { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";

describe("DepartureServiceV1", () => {
    it("maps metroOnly requests to the v2 service contract", async () => {
        const departureServiceV2 = {
            getDepartures: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<DepartureServiceV2>;
        const service = new DepartureServiceV1(departureServiceV2);

        await service.getDepartures({
            stopIds: ["S1"],
            platformIds: ["P1"],
            metroOnly: true,
        });

        expect(departureServiceV2.getDepartures).toHaveBeenCalledWith({
            stopIds: ["S1"],
            platformIds: ["P1"],
            vehicleType: "metro",
            excludeVehicleType: null,
            limit: null,
            totalLimit: null,
            minutesBefore: 0,
            minutesAfter: 24 * 60,
        });
    });
});
