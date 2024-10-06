import { Args, Query, Resolver } from "@nestjs/graphql";

import { Platform } from "src/models/platform.model";
import { PlatformService } from "src/modules/platform/platform.service";
import { metroOnlyQuery } from "src/swagger/query.swagger";

@Resolver(() => Platform)
export class PlatformResolver {
    constructor(private readonly platformService: PlatformService) {}

    @Query(() => [Platform], {
        description: "Get all platforms",
    })
    async platform(
        @Args("metroOnly", {
            description: metroOnlyQuery.description,
            defaultValue: false,
            nullable: true,
            type: () => Boolean,
        })
        metroOnly,
    ): Promise<Platform[]> {
        return await this.platformService.getAllPlatforms({ metroOnly });
    }
}
