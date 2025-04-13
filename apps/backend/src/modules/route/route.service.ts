import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { group, unique } from "radash";

import { PrismaService } from "src/modules/prisma/prisma.service";

const gtfsRouteSelect = {
    id: true,
    shortName: true,
    longName: true,
    isNight: true,
    color: true,
    url: true,
    type: true,
    GtfsRouteStop: {
        select: {
            directionId: true,
            stopId: true,
            stopSequence: true,
            platform: {
                select: {
                    id: true,
                    latitude: true,
                    longitude: true,
                    name: true,
                    isMetro: true,
                    code: true,
                },
            },
        },
        orderBy: {
            stopSequence: "asc",
        },
    },
} as const satisfies Prisma.GtfsRouteSelect;

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
            select: gtfsRouteSelect.GtfsRouteStop.select,
            where: {
                routeId: id,
            },
            orderBy: {
                stopSequence: "asc",
            },
        });

        const stops = await this.prisma.platform.findMany({
            select: gtfsRouteSelect.GtfsRouteStop.select.platform.select,
            where: {
                id: {
                    in: unique(
                        routeStops
                            .map((item) => item.stopId)
                            .filter((item) => item !== null),
                    ),
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

    private processRoute(
        route: Prisma.GtfsRouteGetPayload<{ select: typeof gtfsRouteSelect }>,
    ) {
        return {
            ...route,
            id: route.id.slice(1),
            name: route.shortName,
            directions: Object.entries(
                group(route.GtfsRouteStop, ({ directionId }) => directionId),
            ).map(([key, value]) => ({
                id: key,
                platforms: value?.map((v) => v.platform),
            })),
        };
    }

    async getManyGraphQL({
        where = {},
    }: {
        where?: Prisma.GtfsRouteWhereInput;
    } = {}) {
        const routes = await this.prisma.gtfsRoute.findMany({
            select: gtfsRouteSelect,
            where,
        });

        return routes.map(this.processRoute);
    }

    async getOneGraphQL(id: string) {
        const route = await this.prisma.gtfsRoute.findFirst({
            select: gtfsRouteSelect,
            where: { id },
        });

        if (!route) {
            return null;
        }

        return this.processRoute(route);
    }
}
