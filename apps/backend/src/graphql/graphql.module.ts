import { Module } from "@nestjs/common";

import { GraphqlResolver } from "src/graphql/graphql.resolver";
import { GraphqlService } from "src/graphql/graphql.service";

@Module({
    providers: [GraphqlResolver, GraphqlService],
})
export class GraphqlModule {}
