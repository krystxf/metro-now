import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { PlatformService } from "src/modules/platform/platform.service";
import { StopService } from "src/modules/stop/stop.service";
import { IQuery, Stop } from "src/types/graphql.generated";

@Resolver()
export class StopResolver {
    constructor(
        private readonly stopService: StopService,
        private readonly platformService: PlatformService,
    ) {}

    @Query("stops")
    getAll(@Args("ids") ids: string[]): Promise<IQuery["stops"]> {
        return this.stopService.getAll({
            metroOnly: false,
            where: {
                id: { in: ids },
            },
        }) as Promise<IQuery["stops"]>;
    }

    @Query("stop")
    getOne(@Args("id") id: string) {
        return this.stopService.getOne({ where: { id } });
    }

    @ResolveField("platforms")
    getPlatforms(@Parent() stop: Stop) {
        if (!stop.platforms) {
            return [];
        }

        const ids = stop.platforms.map((p) => p.id);

        return this.platformService.getAll({
            metroOnly: false,
            where: { id: { in: ids } },
        });
    }
}
