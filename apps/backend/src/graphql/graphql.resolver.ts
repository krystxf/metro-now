import { Query, Resolver } from "@nestjs/graphql";

import { IQuery } from "src/types/graphql.generated";

@Resolver()
export class GraphqlResolver {
    @Query("hello")
    hello(): IQuery["hello"] {
        return "Hello, world!";
    }

    @Query("stops")
    stops(): IQuery["stops"] {
        return [];
    }
}
