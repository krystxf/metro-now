import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { PlatformsByStopLoader } from "src/modules/dataloader/platforms-by-stop.loader";
import { StopService } from "src/modules/stop/stop.service";
import { ParentType } from "src/types/parent";

@Resolver("Stop")
export class StopResolver {
    constructor(
        private readonly stopService: StopService,
        private readonly platformsByStopLoader: PlatformsByStopLoader,
    ) {}

    @Query("stop")
    getOne(@Args("id") id: string) {
        return this.stopService.getOne({ where: { id } });
    }

    @Query("stops")
    async getMultiple(
        @Args("ids") ids: string[] | undefined,
        @Args("limit") limit: number | undefined,
        @Args("offset") offset: number | undefined,
    ) {
        const res = await this.stopService.getAllGraphQL({
            where: ids ? { id: { in: ids } } : {},
            limit: limit ?? undefined,
            offset: offset ?? undefined,
        });

        return res;
    }

    @ResolveField("platforms")
    getPlatformsField(
        @Parent()
        stop: ParentType<typeof this.getMultiple>,
    ) {
        const platformIds = stop.platforms.map((p) => p.id);
        return this.platformsByStopLoader.loadMany(platformIds);
    }
}
