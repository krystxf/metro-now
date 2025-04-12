import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { PlatformService } from "src/modules/platform/platform.service";
import { StopService } from "src/modules/stop/stop.service";
import { ParentType } from "src/types/parent";

@Resolver()
export class StopResolver {
    constructor(
        private readonly stopService: StopService,
        private readonly platformService: PlatformService,
    ) {}

    @Query("stop")
    getOne(@Args("id") id: string) {
        return this.stopService.getOne({ where: { id } });
    }

    @Query("stops")
    getMultiple(@Args("ids") ids: string[]) {
        return this.stopService.getAll({
            metroOnly: false,
            where: {
                id: { in: ids },
            },
        });
    }

    @ResolveField("platforms")
    getPlatformsField(
        @Parent()
        stop: ParentType<typeof this.getOne> &
            ParentType<typeof this.getMultiple>,
    ) {
        const ids = stop.platforms.map((p) => p.id);
        if (ids.length === 0) return [];

        return this.platformService.getAll({
            metroOnly: false,
            where: { id: { in: ids } },
        });
    }
}
