import { type GtfsFeedId } from "@metro-now/database";
import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { toLookupRouteId } from "src/modules/route/route-id.utils";
import { getVehicleTypeFromDatabaseType } from "src/modules/route/route-vehicle-type.utils";
import { RouteService } from "src/modules/route/route.service";
import type { VehicleType } from "src/types/graphql.generated";
import type { ParentType } from "src/types/parent";

@Resolver("Route")
export class RouteResolver {
    constructor(private readonly routeService: RouteService) {}

    private toDatabaseRouteId(id: string): string {
        return toLookupRouteId(id);
    }

    @Query("route")
    getOne(@Args("id") id: string) {
        return this.routeService.getOneGraphQL(this.toDatabaseRouteId(id));
    }

    @Query("routes")
    getMany(@Args("vehicleType") vehicleType?: VehicleType[]) {
        return this.routeService.getManyGraphQL(
            vehicleType ? { vehicleType } : {},
        );
    }

    @ResolveField("isSubstitute")
    getIsSubstitute(@Parent() route: ParentType<typeof this.getMany>) {
        return this.routeService.isSubstitute(route.name);
    }

    @ResolveField("isNight")
    getIsNight(@Parent() route: ParentType<typeof this.getMany>) {
        return this.routeService.isNight(
            route.name,
            typeof route.feed === "string"
                ? (route.feed as GtfsFeedId)
                : undefined,
        );
    }

    @ResolveField("vehicleType")
    getVehicleType(
        @Parent() route: ParentType<typeof this.getMany>,
    ): VehicleType {
        const persistedVehicleType =
            typeof route === "object" &&
            route !== null &&
            "vehicleType" in route &&
            typeof route.vehicleType === "string"
                ? getVehicleTypeFromDatabaseType(route.vehicleType)
                : null;

        if (persistedVehicleType) {
            return persistedVehicleType;
        }

        return this.routeService.getVehicleTypeForRoute({
            routeName: route.name ?? "",
            ...((typeof route === "object" &&
            route !== null &&
            "feed" in route &&
            typeof route.feed === "string"
                ? {
                      feedId: route.feed as GtfsFeedId,
                  }
                : {}) as { feedId?: GtfsFeedId | null }),
            ...((typeof route === "object" &&
            route !== null &&
            "type" in route &&
            typeof route.type === "string"
                ? {
                      gtfsRouteType: route.type,
                  }
                : {}) as { gtfsRouteType?: string | null }),
        });
    }
}
