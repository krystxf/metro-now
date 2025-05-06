import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { RouteService } from "src/modules/route/route.service";
import { VehicleType } from "src/types/graphql.generated";
import { ParentType } from "src/types/parent";

@Resolver("Route")
export class RouteResolver {
    constructor(private readonly routeService: RouteService) {}

    @Query("route")
    getOne(@Args("id") id: string) {
        return this.routeService.getOneGraphQL(`L${id}`);
    }

    @Query("routes")
    getMany() {
        return this.routeService.getManyGraphQL();
    }

    @ResolveField("isSubstitute")
    getIsSubstitute(@Parent() route: ParentType<typeof this.getMany>) {
        return this.routeService.isSubstitute(route.name);
    }

    @ResolveField("isNight")
    getIsNight(@Parent() route: ParentType<typeof this.getMany>) {
        return this.routeService.isNight(route.name);
    }

    @ResolveField("vehicleType")
    getVehicleType(
        @Parent() route: ParentType<typeof this.getMany>,
    ): VehicleType {
        return this.routeService.getVehicleType(route.name);
    }
}
