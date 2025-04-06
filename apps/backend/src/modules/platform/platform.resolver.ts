import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";

import { PlatformService } from "src/modules/platform/platform.service";
import { StopService } from "src/modules/stop/stop.service";
import { IQuery, Platform } from "src/types/graphql.generated";

@Resolver("Platform")
export class PlatformResolver {
    constructor(
        private readonly platformService: PlatformService,
        private readonly stopService: StopService,
    ) {}

    @Query("platforms")
    getAll(@Args("ids") ids: string[]): Promise<IQuery["platforms"]> {
        return this.platformService.getAll({
            metroOnly: false,
            where: { id: { in: ids } },
        }) as Promise<IQuery["platforms"]>;
    }

    @Query("platform")
    getOne(@Args("id") id: string): Promise<IQuery["platform"]> {
        return this.platformService.getOne(id) as Promise<IQuery["platform"]>;
    }

    @ResolveField("stop")
    getStop(@Parent() platform: Platform) {
        return this.stopService.getOne({
            where: { platforms: { some: { id: platform.id } } },
        });
    }
}
