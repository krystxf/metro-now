import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { PlatformService } from "src/modules/platform/platform.service";
import { StopService } from "src/modules/stop/stop.service";
import { ParentType } from "src/types/parent";

@Resolver("Platform")
export class PlatformResolver {
    constructor(
        private readonly platformService: PlatformService,
        private readonly stopService: StopService,
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
}
