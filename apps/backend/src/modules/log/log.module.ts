import {
    type MiddlewareConsumer,
    Module,
    type NestModule,
} from "@nestjs/common";

import { GraphQLQueryLoggingPlugin } from "src/modules/log/graphql-query-logging.plugin";
import { LogService } from "src/modules/log/log.service";
import { RequestLogService } from "src/modules/log/request-log.service";
import { RequestLoggingMiddleware } from "src/modules/log/request-logging.middleware";

@Module({
    providers: [RequestLogService, LogService, GraphQLQueryLoggingPlugin],
    exports: [RequestLogService, GraphQLQueryLoggingPlugin],
})
export class LogModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggingMiddleware).forRoutes("*");
    }
}
