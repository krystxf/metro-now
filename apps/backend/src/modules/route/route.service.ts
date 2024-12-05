import { Injectable } from "@nestjs/common";
import { group, unique } from "radash";

import { platformSelect } from "src/modules/platform/platform.service";
import { PrismaService } from "src/modules/prisma/prisma.service";

const gtfsRouteSelect = {
    id: true,
    shortName: true,
    longName: true,
    isNight: true,
    color: true,
    url: true,
    type: true,
};

const gtfsRouteStopSelect = {
    directionId: true,
    stopId: true,
    stopSequence: true,
};

@Injectable()
export class RouteService {
    constructor(private prisma: PrismaService) {}

    async getRoute(id: string) {
        const route = await this.prisma.gtfsRoute.findFirst({
            select: gtfsRouteSelect,
            where: {
                id,
            },
        });

        const routeStops = await this.prisma.gtfsRouteStop.findMany({
            select: gtfsRouteStopSelect,
            where: {
                routeId: id,
            },
            orderBy: {
                stopSequence: "asc",
            },
        });

        const stops = await this.prisma.platform.findMany({
            select: platformSelect,
            where: {
                id: {
                    in: unique(routeStops.map((item) => item.stopId)),
                },
            },
        });

        return {
            ...route,
            directions: group(
                routeStops.map((routeStop) => ({
                    ...routeStop,
                    stop: stops.find((stop) => stop.id === routeStop.stopId),
                })),
                (item) => item.directionId,
            ),
        };
    }
}
