import { Args, Query, Resolver } from "@nestjs/graphql";

import { PlatformService } from "src/modules/platform/platform.service";
import { IQuery } from "src/types/graphql.generated";

@Resolver("Platform")
export class PlatformResolver {
    constructor(private readonly platformService: PlatformService) {}

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
}
