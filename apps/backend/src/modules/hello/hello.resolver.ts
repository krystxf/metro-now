import { Query, Resolver } from "@nestjs/graphql";

import { IQuery } from "src/types/graphql.generated";

@Resolver()
export class HelloResolver {
    @Query("hello")
    hello(): IQuery["hello"] {
        return "Hello, world!";
    }
}
