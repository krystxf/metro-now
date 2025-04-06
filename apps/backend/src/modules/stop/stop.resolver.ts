import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { PlatformService } from "src/modules/platform/platform.service";
import { StopService } from "src/modules/stop/stop.service";
import { IQuery, Stop } from "src/types/graphql.generated";

@Resolver()
export class StopResolver {
    constructor(private readonly stopService: StopService) {}

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
    getOne(@Args("id") id: string): Promise<IQuery["stop"]> {
        return this.stopService.getOne(id) as Promise<IQuery["stop"]>;
    }
}

@Resolver("Stop")
export class StopFieldResolver {
    constructor(private readonly platformService: PlatformService) {}

    @ResolveField("platforms")
    async getPlatforms(@Parent() stop: Stop) {
        const ids = stop.platforms.map((p) => p.id);

        return this.platformService.getAll({
            metroOnly: false,
            where: { id: { in: ids } },
        }) as Promise<IQuery["platforms"]>;
    }
}
