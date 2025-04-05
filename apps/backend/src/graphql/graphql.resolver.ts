import { Args, Query, Resolver } from "@nestjs/graphql";

import { IQuery } from "src/types/graphql.generated";

@Resolver()
export class GraphqlResolver {
    @Query("stops")
    stops(): IQuery["stops"] {
        return [];
    }

    @Query("stop")
    stop(@Args("id") id: string): IQuery["stop"] {
        return {
            id,
            name: "Stop 1",
            avgLatitude: 1,
            avgLongitude: 1,
            platforms: [],
        };
    }
}
