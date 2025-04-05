import { Args, Query, Resolver } from "@nestjs/graphql";

import { StopService } from "src/modules/stop/stop.service";
import { IQuery } from "src/types/graphql.generated";

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
