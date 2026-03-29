import { Query, Resolver } from "@nestjs/graphql";

import type { IQuery } from "src/types/graphql.generated";

@Resolver()
export class HelloResolver {
    @Query("hello")
    getHello(): IQuery["hello"] {
        return "Hello, world!";
    }
}
