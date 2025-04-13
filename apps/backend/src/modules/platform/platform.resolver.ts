import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { PlatformService } from "src/modules/platform/platform.service";
import { RouteService } from "src/modules/route/route.service";
import { StopService } from "src/modules/stop/stop.service";
import { ParentType } from "src/types/parent";

@Resolver("Platform")
export class PlatformResolver {
    constructor(
        private readonly platformService: PlatformService,
        private readonly stopService: StopService,
        private readonly routeService: RouteService,
    ) {}

    @Query("platform")
    getOne(@Args("id") id: string) {
        return this.platformService.getOne({ where: { id } });
    }

    @Query("platforms")
    getMultiple(@Args("ids") ids: string[]) {
        return this.platformService.getAll({
            metroOnly: false,
            where: { id: { in: ids } },
        });
    }

    @ResolveField("stop")
    getStopField(
        @Parent()
        platform: ParentType<typeof this.getMultiple> &
            ParentType<typeof this.getOne>,
    ) {
        return this.stopService.getOne({
            where: { platforms: { some: { id: platform.id } } },
        });
    }

    @ResolveField("routes")
    getRoutesField(
        @Parent()
        platform: ParentType<typeof this.getMultiple> &
            ParentType<typeof this.getOne>,
    ) {
        return this.routeService.getManyGraphQL({
            where: {
                GtfsRouteStop: { some: { platform: { id: platform.id } } },
            },
        });
    }
}
