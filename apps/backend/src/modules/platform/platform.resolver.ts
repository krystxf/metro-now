import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { RoutesByPlatformIdLoader } from "src/modules/dataloader/routes-by-platform.loader";
import { StopByPlatformLoader } from "src/modules/dataloader/stop-by-platform.loader";
import { PlatformService } from "src/modules/platform/platform.service";
import type { ParentType } from "src/types/parent";

@Resolver("Platform")
export class PlatformResolver {
    constructor(
        private readonly platformService: PlatformService,
        private readonly routesByPlatformIdLoader: RoutesByPlatformIdLoader,
        private readonly stopByPlatformLoader: StopByPlatformLoader,
    ) {}

    @Query("platform")
    getOne(@Args("id") id: string) {
        return this.platformService.getOneById(id);
    }

    @Query("platforms")
    getMultiple(@Args("ids") ids: string[] | undefined) {
        if (!ids || ids.length === 0) {
            return this.platformService.getAllGraphQL({
                metroOnly: false,
            });
        }

        return this.platformService.getGraphQLByIds(ids);
    }

    @ResolveField("stop")
    getStopField(
        @Parent()
        platform: ParentType<typeof this.getMultiple> &
            ParentType<typeof this.getOne>,
    ) {
        if (!platform.stopId) {
            return null;
        }

        return this.stopByPlatformLoader.load(platform.stopId);
    }

    @ResolveField("routes")
    getRoutesField(
        @Parent()
        platform: ParentType<typeof this.getMultiple> &
            ParentType<typeof this.getOne>,
    ) {
        if ("routes" in platform && Array.isArray(platform.routes)) {
            return platform.routes;
        }

        return this.routesByPlatformIdLoader.load(platform.id);
    }
}
