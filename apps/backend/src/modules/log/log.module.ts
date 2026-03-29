import { Module } from "@nestjs/common";

import { GraphQLQueryLoggingPlugin } from "src/modules/log/graphql-query-logging.plugin";
import { LogService } from "src/modules/log/log.service";

@Module({
    providers: [LogService, GraphQLQueryLoggingPlugin],
})
export class LogModule {}
