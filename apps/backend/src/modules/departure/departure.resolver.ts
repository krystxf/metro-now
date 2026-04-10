import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { GraphQLError } from "src/common/graphql-error";
import { PlatformsByStopLoader } from "src/modules/dataloader/platforms-by-stop.loader";
import { RouteByIdLoader } from "src/modules/dataloader/route-by-id.loader";
import { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";
import type { ParentType } from "src/types/parent";

@Resolver("Departure")
export class DepartureResolver {
    constructor(
        private readonly departureServiceV2: DepartureServiceV2,
        private readonly platformByIdLoader: PlatformsByStopLoader,
        private readonly routeByIdLoader: RouteByIdLoader,
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

        const normalizedLimit = Math.max(1, Math.min(limit, 100));
        const departures = await this.departureServiceV2.getDepartures({
            stopIds,
            platformIds,
            vehicleType: "all",
            excludeVehicleType: null,
            limit: normalizedLimit,
            totalLimit: normalizedLimit,
            minutesBefore: 1,
            minutesAfter: 60,
        });

        return departures.map((departure) => ({
            route: departure.routeId ? { id: departure.routeId } : null,
            platform: {
                id: departure.platformId,
            },
            headsign: departure.headsign,
            delay: departure.delay,
            isRealtime: departure.isRealtime,
            departureTime: {
                predicted: departure.departure.predicted,
                scheduled: departure.departure.scheduled,
            },
        }));
    }

    @ResolveField("platform")
    getPlatformField(@Parent() departure: ParentType<typeof this.getMultiple>) {
        return this.platformByIdLoader.load(departure.platform.id);
    }

    @ResolveField("route")
    async getRouteField(
        @Parent() departure: ParentType<typeof this.getMultiple>,
    ) {
        if (!departure?.route?.id) {
            return null;
        }

        return this.routeByIdLoader.load(departure.route.id);
    }
}
