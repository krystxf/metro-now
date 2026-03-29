import { Injectable } from "@nestjs/common";
import { group } from "radash";

import { DatabaseService } from "src/modules/database/database.service";
import { DepartureBoardService } from "src/modules/departure/departure-board.service";
import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";
import type { VehicleTypeSchema } from "src/schema/metro-only.schema";
import { getDelayInSeconds } from "src/utils/delay";

@Injectable()
export class DepartureServiceV2 {
    constructor(
        private readonly departureBoardService: DepartureBoardService,
        private readonly database: DatabaseService,
    ) {}

    async getDepartures(args: {
        stopIds: string[];
        platformIds: string[];
        vehicleType: VehicleTypeSchema;
        excludeVehicleType: VehicleTypeSchema | null;
        limit: number | null;
        totalLimit: number | null;
        minutesBefore: number;
        minutesAfter: number;
    }): Promise<DepartureSchema[]> {
        const vehicleTypeWhere =
            args.vehicleType === "metro"
                ? { isMetro: true }
                : args.excludeVehicleType === "metro"
                  ? { isMetro: false }
                  : undefined;

        const allPlatformIds =
            await this.departureBoardService.resolvePlatformIds({
                platformIds: args.platformIds,
                stopIds: args.stopIds,
                ...(vehicleTypeWhere?.isMetro !== undefined
                    ? { metroOnly: vehicleTypeWhere.isMetro }
                    : {}),
            });

        if (allPlatformIds.length === 0) {
            return [];
        }

        const departureBoard =
            await this.departureBoardService.fetchDepartureBoard({
                platformIds: allPlatformIds,
                params: {
                    limit: args.totalLimit ?? 1_000,
                    minutesAfter: args.minutesAfter,
                    minutesBefore: args.minutesBefore,
                    mode: "departures",
                    order: "real",
                    skip: "canceled",
                },
            });

        const routeShortNames = [
            ...new Set(
                departureBoard.departures.map(
                    (departure) => departure.route.short_name,
                ),
            ),
        ];
        const gtfsRoutes =
            routeShortNames.length === 0
                ? []
                : await this.database.db
                      .selectFrom("GtfsRoute")
                      .select(["id", "shortName"])
                      .where("shortName", "in", routeShortNames)
                      .execute();

        const gtfsRouteIdByShortName = new Map(
            gtfsRoutes.map((route) => [route.shortName, route.id]),
        );

        const parsedDepartures = departureBoard.departures.map((departure) => {
            return {
                id: departure.trip.id,
                departure: departure.departure_timestamp,
                delay: getDelayInSeconds(departure.delay),
                headsign: departure.trip.headsign,
                route: departure.route.short_name,
                routeId:
                    gtfsRouteIdByShortName.get(departure.route.short_name) ??
                    null,
                platformId: departure.stop.id,
                platformCode: departure.stop.platform_code,
            };
        });

        const limit = args.limit;
        const totalLimit = args.totalLimit ?? 1000;

        const limitedByPlatformAndRoute =
            limit !== null && limit < totalLimit
                ? getLimitedRes(parsedDepartures, limit)
                : parsedDepartures;

        return limitedByPlatformAndRoute
            .sort(
                (a, b) =>
                    +new Date(a.departure.predicted) -
                    +new Date(b.departure.predicted),
            )
            .slice(0, totalLimit);
    }
}

const getLimitedRes = (
    departures: DepartureSchema[],
    limit: number,
): DepartureSchema[] => {
    const groupedDepartures = group(
        departures,
        (departure) => `${departure.platformCode}-${departure.route}`,
    );
    const groupedDeparturesValues = Object.values(groupedDepartures);

    return groupedDeparturesValues.flatMap((departures) =>
        (departures ?? []).slice(0, limit),
    );
};
