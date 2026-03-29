import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { GraphQLError } from "src/common/graphql-error";
import { DepartureBoardService } from "src/modules/departure/departure-board.service";
import { PlatformService } from "src/modules/platform/platform.service";
import { RouteService } from "src/modules/route/route.service";
import type { ParentType } from "src/types/parent";

const ROUTE_ID_BY_NAME = {
    A: "L991",
    B: "L992",
    C: "L993",
};

@Resolver("Departure")
export class DepartureResolver {
    constructor(
        private readonly departureBoardService: DepartureBoardService,
        private readonly platformService: PlatformService,
        private readonly routeService: RouteService,
    ) {}

    @Query("departures")
    async getMultiple(
        @Args("platformIds") platformIds: string[] = [],
        @Args("stopIds") stopIds: string[] = [],
        @Args("limit") limit = 100,
    ) {
        if (platformIds.length === 0 && stopIds.length === 0) {
            throw GraphQLError({
                message: "At least one `platformId` or `stopId` is required",
                code: "BAD_USER_INPUT",
            });
        }

        const resolvedPlatformIds =
            await this.departureBoardService.resolvePlatformIds({
                platformIds,
                stopIds,
            });
        const normalizedLimit = Math.max(1, Math.min(limit, 100));
        const json = await this.departureBoardService.fetchDepartureBoard({
            platformIds: resolvedPlatformIds,
            params: {
                includeMetroTrains: true,
                limit: normalizedLimit,
                minutesBefore: 1,
                mode: "departures",
                order: "real",
                skip: "canceled",
            },
        });

        return json.departures.map((departure) => ({
            ...departure,
            route: {
                id:
                    ROUTE_ID_BY_NAME[departure.route.short_name] ??
                    `L${departure.route.short_name}`,
            },
            platform: departure.stop,
            headsign: departure.trip.headsign,
            delay: departure.delay.is_available
                ? (departure.delay.minutes ?? 0) * 60 +
                  (departure.delay.seconds ?? 0)
                : 0,
            departureTime: {
                predicted: departure.departure_timestamp.predicted,
                scheduled: departure.departure_timestamp.scheduled,
            },
        }));
    }

    @ResolveField("platform")
    getPlatformField(@Parent() departure: ParentType<typeof this.getMultiple>) {
        return this.platformService.getOneById(departure.platform.id);
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
