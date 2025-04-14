import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { RoutesByPlatformIdLoader } from "src/modules/dataloader/routes-by-platform.loader";
import { StopByPlatformLoader } from "src/modules/dataloader/stop-by-platform.loader";
import { PlatformService } from "src/modules/platform/platform.service";
import { ParentType } from "src/types/parent";

@Resolver("Platform")
export class PlatformResolver {
    constructor(
        private readonly platformService: PlatformService,
        private readonly routesByPlatformIdLoader: RoutesByPlatformIdLoader,
        private readonly stopByPlatformLoader: StopByPlatformLoader,
    ) {}

    @Query("platform")
    getOne(@Args("id") id: string) {
        return this.platformService.getOne({ where: { id } });
    }

    @Query("platforms")
    getMultiple(@Args("ids") ids: string[]) {
        return this.platformService.getAllGraphQL({
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
        return this.routesByPlatformIdLoader.load(platform.id);
    }
}
