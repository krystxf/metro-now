import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { PlatformsByStopLoader } from "src/modules/dataloader/dataloader.service";
import { PlatformService } from "src/modules/platform/platform.service";
import { StopService } from "src/modules/stop/stop.service";
import { ParentType } from "src/types/parent";

@Resolver()
export class StopResolver {
    constructor(
        private readonly stopService: StopService,
        private readonly platformService: PlatformService,
        private readonly platformsByStopLoader: PlatformsByStopLoader,
    ) {}

    @Query("stop")
    getOne(@Args("id") id: string) {
        return this.stopService.getOne({ where: { id } });
    }

    @Query("stops")
    getMultiple(
        @Args("ids") ids: string[] | undefined,
        @Args("limit") limit: number | undefined,
        @Args("offset") offset: number | undefined,
    ) {
        return this.stopService.getAll({
            metroOnly: false,
            where: ids ? { id: { in: ids } } : {},
            limit: limit ?? undefined,
            offset: offset ?? undefined,
        });
    }

    @ResolveField("platforms")
    getPlatformsField(
        @Parent()
        stop: ParentType<typeof this.getOne> &
            ParentType<typeof this.getMultiple>,
    ) {
        console.log("getPlatformsField", stop.platforms);
        const ids = stop.platforms.map((p) => p.id);
        if (ids.length === 0) return [];

        return this.platformsByStopLoader.loadMany(ids);
    }
}
