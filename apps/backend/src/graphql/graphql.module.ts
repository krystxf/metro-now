import { Module } from "@nestjs/common";

import { GraphqlResolver } from "src/graphql/graphql.resolver";

@Module({
    providers: [GraphqlResolver],
})
export class GraphqlModule {}
