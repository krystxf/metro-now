import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { GraphQLError } from "src/common/graphql-error";
import { GolemioService } from "src/modules/golemio/golemio.service";
import { PlatformService } from "src/modules/platform/platform.service";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { RouteService } from "src/modules/route/route.service";
import { ParentType } from "src/types/parent";

@Resolver("Departure")
export class DepartureResolver {
    constructor(
        private golemioService: GolemioService,
        private prismaService: PrismaService,
        private platformService: PlatformService,
        private readonly routeService: RouteService,
    ) {}

    @Query("departures")
    async getMultiple(
        @Args("platformIds") platformIds: string[] = [],
        @Args("stopIds") stopIds: string[] = [],
    ) {
        if (platformIds.length === 0 && stopIds.length === 0) {
            return GraphQLError({
                message: "At least one `platformId` or `stopId` is required",
                code: "BAD_USER_INPUT",
            });
        }

        const stopPlatforms = await this.prismaService.stop.findMany({
            select: { platforms: { select: { id: true } } },
            where: { id: { in: stopIds } },
        });
        const stopPlatformIds = stopPlatforms.flatMap(({ platforms }) =>
            platforms.map(({ id }) => id),
        );

        const searchParams = new URLSearchParams(
            platformIds
                .concat(stopPlatformIds)
                .map((id) => ["ids", id])
                .concat([
                    ["skip", "canceled"],
                    ["mode", "departures"],
                    ["order", "real"],
                ]),
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

        return json.departures.map((departure) => ({
            ...departure,
            route: { id: `L${departure.route.short_name}` },
            platform: departure.stop,
            headsign: departure.trip.headsign,
            delay: departure.delay.is_available
                ? (departure.delay.minutes ?? 0) * 60 +
                  (departure.delay.seconds ?? 0)
                : undefined,
            departureTime: {
                predicted: departure.departure_timestamp.predicted,
                scheduled: departure.departure_timestamp.scheduled,
            },
        }));
    }

    @ResolveField("platform")
    getPlatformField(@Parent() departure: ParentType<typeof this.getMultiple>) {
        return this.platformService.getOne({
            where: { id: departure.platform.id },
        });
    }

    @ResolveField("route")
    async getRouteField(
        @Parent() departure: ParentType<typeof this.getMultiple>,
    ) {
        if (!departure?.route?.id) {
            return null;
        }

        return this.routeService.getOneGraphQL(departure.route.id);
    }
}
