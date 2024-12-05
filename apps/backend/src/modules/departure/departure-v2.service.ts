import { Injectable } from "@nestjs/common";
import { group, unique } from "radash";

import { departureBoardsSchema } from "src/modules/departure/schema/departure-boards.schema";
import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";
import { GolemioService } from "src/modules/golemio/golemio.service";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { VehicleTypeSchema } from "src/schema/metro-only.schema";
import { getDelayInSeconds } from "src/utils/delay";

@Injectable()
export class DepartureServiceV2 {
    constructor(
        private prisma: PrismaService,
        private golemioService: GolemioService,
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

        const dbPlatforms = (
            await this.prisma.platform.findMany({
                select: { id: true },
                where: {
                    id: { in: args.platformIds },
                    ...vehicleTypeWhere,
                },
            })
        ).map((platform) => platform.id);

        const stopPlatforms = (
            await this.prisma.stop.findMany({
                select: {
                    platforms: {
                        select: { id: true },
                        where: vehicleTypeWhere ?? {},
                    },
                },
                where: { id: { in: args.stopIds } },
            })
        ).flatMap((stop) => stop.platforms.map((platform) => platform.id));

        const allPlatformIds = unique([...dbPlatforms, ...stopPlatforms]).slice(
            0,
            100,
        );

        if (allPlatformIds.length === 0) {
            return [];
        }

        const searchParams = new URLSearchParams(
            allPlatformIds
                .map((id) => ["ids", id])
                .concat(
                    Object.entries({
                        skip: "canceled",
                        mode: "departures",
                        order: "real",
                        minutesBefore: String(args.minutesBefore),
                        minutesAfter: String(args.minutesAfter),
                        limit: String(args.totalLimit ?? 1_000),
                    }),
                ),
        );

        const res = await this.golemioService.getGolemioData(
            `/v2/pid/departureboards?${searchParams.toString()}`,
        );

        if (!res.ok) {
            throw new Error(
                `Failed to fetch departure data: ${res.status} ${res.statusText}`,
            );
        }

        const json = await res.json();
        const parsed = departureBoardsSchema.safeParse(json);

        if (!parsed.success) {
            throw new Error(parsed.error.message);
        }

        const gtfsRoutes = await this.prisma.gtfsRoute.findMany({
            where: {
                shortName: {
                    in: parsed.data.departures.map(
                        (departure) => departure.route.short_name,
                    ),
                },
            },
        });

        const parsedDepartures = parsed.data.departures.map((departure) => {
            return {
                id: departure.trip.id,
                departure: departure.departure_timestamp,
                delay: getDelayInSeconds(departure.delay),
                headsign: departure.trip.headsign,
                route: departure.route.short_name,
                routeId:
                    gtfsRoutes.find(
                        (gtfsRoute) =>
                            gtfsRoute.shortName === departure.route.short_name,
                    )?.id ?? null,
                platformId: departure.stop.id,
                platformCode: departure.stop.platform_code,
            };
        });

        const limit = args.limit;
        const totalLimit = args.totalLimit ?? 1000;

        if (limit === null && totalLimit === null) {
            return parsedDepartures;
        }

        const limitedByPlatformAndRoute =
            limit !== null && limit < totalLimit
                ? getLimitedRes(parsedDepartures, limit)
                : parsedDepartures;

        const resss = limitedByPlatformAndRoute
            .sort(
                (a, b) =>
                    +new Date(a.departure.predicted) -
                    +new Date(b.departure.predicted),
            )
            .slice(0, totalLimit ?? limitedByPlatformAndRoute.length);

        return resss;
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
