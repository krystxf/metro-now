import {
    type MiddlewareConsumer,
    Module,
    type NestModule,
} from "@nestjs/common";

import { RequestLogService } from "src/modules/log/request-log.service";
import { RequestLoggingMiddleware } from "src/modules/log/request-logging.middleware";

@Module({
    providers: [RequestLogService],
    exports: [RequestLogService],
})
export class LogModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggingMiddleware).forRoutes("*");
    }
}
