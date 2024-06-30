import { MiddlewareConsumer, Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MetroController } from "./metro/metro.controller";
import { ConfigModule } from "@nestjs/config";
import { RequestLoggerMiddleware } from "./middleware/request-logger.middleware";
import { TTL } from "./constants/constants";
@Module({
    imports: [
        ConfigModule.forRoot(),
        CacheModule.register({
            isGlobal: true,
            ttl: TTL,
        }),
    ],
    controllers: [AppController, MetroController],
    providers: [AppService],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerMiddleware).forRoutes("*");
    }
}
