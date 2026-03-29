import { Injectable } from "@nestjs/common";

import { DepartureBoardService } from "src/modules/departure/departure-board.service";
import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";
import { getDelayInSeconds } from "src/utils/delay";

@Injectable()
export class DepartureServiceV1 {
    constructor(
        private readonly departureBoardService: DepartureBoardService,
    ) {}

    async getDepartures(args: {
        stopIds: string[];
        platformIds: string[];
        metroOnly: boolean;
    }): Promise<DepartureSchema[]> {
        const allPlatformIds =
            await this.departureBoardService.resolvePlatformIds({
                platformIds: args.platformIds,
                stopIds: args.stopIds,
                ...(args.metroOnly ? { metroOnly: true } : {}),
            });

        if (allPlatformIds.length === 0) {
            return [];
        }

        const departureBoard =
            await this.departureBoardService.fetchDepartureBoard({
                platformIds: allPlatformIds,
                params: {
                    minutesAfter: 24 * 60,
                    mode: "departures",
                    order: "real",
                    skip: "canceled",
                },
            });

        const parsedDepartures = departureBoard.departures.map((departure) => {
            return {
                departure: departure.departure_timestamp,
                delay: getDelayInSeconds(departure.delay),
                headsign: departure.trip.headsign,
                route: departure.route.short_name,
                platformId: departure.stop.id,
                platformCode: departure.stop.platform_code,
            };
        });

        return parsedDepartures;
    }
}
