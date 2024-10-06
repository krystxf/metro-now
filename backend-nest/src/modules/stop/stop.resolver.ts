import { Args, Query, Resolver } from "@nestjs/graphql";

import { Stop } from "src/models/stop.model";
import { StopService } from "src/modules/stop/stop.service";
import { metroOnlyQuery } from "src/swagger/query.swagger";

@Resolver(() => Stop)
export class StopResolver {
    constructor(private readonly stopService: StopService) {}

    @Query(() => [Stop], {
        description: "Get all stops",
    })
    async stop(
        @Args("metroOnly", {
            description: metroOnlyQuery.description,
            defaultValue: false,
            nullable: true,
            type: () => Boolean,
        })
        metroOnly,
    ): Promise<Stop[]> {
        return this.stopService.getAll({ metroOnly });
    }
}
