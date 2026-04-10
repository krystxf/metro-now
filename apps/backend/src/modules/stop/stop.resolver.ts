import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { PlatformsByStopLoader } from "src/modules/dataloader/platforms-by-stop.loader";
import { StopService } from "src/modules/stop/stop.service";
import type { ParentType } from "src/types/parent";

@Resolver("Stop")
export class StopResolver {
    constructor(
        private readonly stopService: StopService,
        private readonly platformsByStopLoader: PlatformsByStopLoader,
    ) {}

    @Query("stop")
    async getOne(@Args("id") id: string) {
        const [stop] = await this.stopService.getGraphQLByIds([id]);

        return stop ?? null;
    }

    @Query("stops")
    async getMultiple(
        @Args("ids") ids: string[] | undefined,
        @Args("limit") limit: number | undefined,
        @Args("offset") offset: number | undefined,
    ) {
        if (ids && ids.length > 0) {
            const stops = await this.stopService.getGraphQLByIds(ids);
            const start = offset ?? 0;
            const end = typeof limit === "number" ? start + limit : undefined;

            return stops.slice(start, end);
        }

        const res = await this.stopService.getAllGraphQL({
            ...(typeof limit === "number" ? { limit } : {}),
            ...(typeof offset === "number" ? { offset } : {}),
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
