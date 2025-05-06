import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { group } from "radash";

import { PrismaService } from "src/modules/prisma/prisma.service";
import {
    BUS_PREFIXES,
    METRO_LINES,
    TRAIN_PREFIXES,
} from "src/modules/route/route.const";
import { VehicleType } from "src/types/graphql.generated";

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

    isSubstitute(routeName: string): boolean {
        return routeName.startsWith("X");
    }

    private getNameWithoutSubstitute(routeName: string): string {
        return this.isSubstitute(routeName) ? routeName.slice(1) : routeName;
    }

    isNight(routeName: string): boolean {
        const routeNameParsed = this.getNameWithoutSubstitute(routeName);
        const routeNumber = parseInt(routeNameParsed);

        if (isNaN(routeNumber)) {
            return false;
        }

        return (
            (routeNumber >= 90 && routeNumber < 100) ||
            (routeNumber >= 900 && routeNumber < 1000)
        );
    }

    getVehicleType(routeName: string): VehicleType {
        const routeNameParsed = this.getNameWithoutSubstitute(routeName);
        const routeNumber = parseInt(routeNameParsed);

        if (!isNaN(routeNumber)) {
            if (routeNumber === 58 || routeNumber === 59) {
                return VehicleType.TROLLEYBUS;
            }
            if (routeNumber < 100) {
                return VehicleType.TRAM;
            }
            return VehicleType.BUS;
        }
        if (METRO_LINES.includes(routeNameParsed)) {
            return VehicleType.SUBWAY;
        }
        if (routeName.startsWith("P")) {
            return VehicleType.FERRY;
        }
        if (routeName === "LD") {
            return VehicleType.FUNICULAR;
        }
        if (
            TRAIN_PREFIXES.some((prefix) => routeNameParsed.startsWith(prefix))
        ) {
            return VehicleType.TRAIN;
        }
        if (BUS_PREFIXES.some((prefix) => routeNameParsed.startsWith(prefix))) {
            return VehicleType.BUS;
        }
        return VehicleType.BUS;
    }
}
