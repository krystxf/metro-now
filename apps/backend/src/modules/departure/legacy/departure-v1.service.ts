import { Injectable } from "@nestjs/common";

import { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";
import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";

/**
 * @deprecated Legacy REST-only adapter over DepartureServiceV2 that preserves
 * the v1 `metroOnly` contract for the Android client. Do not use from
 * GraphQL or new code.
 */
@Injectable()
export class DepartureServiceV1 {
    constructor(private readonly departureServiceV2: DepartureServiceV2) {}

    async getDepartures(args: {
        stopIds: string[];
        platformIds: string[];
        metroOnly: boolean;
    }): Promise<DepartureSchema[]> {
        return this.departureServiceV2.getDepartures({
            stopIds: args.stopIds,
            platformIds: args.platformIds,
            vehicleType: args.metroOnly ? "metro" : "all",
            excludeVehicleType: null,
            limit: null,
            totalLimit: null,
            minutesBefore: 0,
            minutesAfter: 24 * 60,
        });
    }
}
