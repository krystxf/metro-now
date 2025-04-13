import { Args, Query, Resolver } from "@nestjs/graphql";

import { RouteService } from "src/modules/route/route.service";

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
}
