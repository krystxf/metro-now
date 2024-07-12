import { MiddlewareConsumer, Module } from "@nestjs/common";
import { CacheInterceptor, CacheModule } from "@nestjs/cache-manager";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MetroController } from "./controllers/metro/metro.controller";
import { ConfigModule } from "@nestjs/config";
import { RequestLoggerMiddleware } from "./middleware/request-logger.middleware";
import { TTL_DEFAULT } from "./constants/constants";
import { ScheduleModule } from "@nestjs/schedule";
import { SyncStopsService } from "./services/sync-stops.service";
import { PrismaService } from "./services/prisma.service";
import { StopController } from "./controllers/stop/stop.controller";
import { APP_INTERCEPTOR } from "@nestjs/core";

@Module({
    imports: [
        ConfigModule.forRoot(),
        ScheduleModule.forRoot(),
        CacheModule.register({
            isGlobal: true,
            ttl: TTL_DEFAULT,
        }),
    ],
    controllers: [AppController, MetroController, StopController],
    providers: [
        AppService,
        PrismaService,
        SyncStopsService,
        {
            provide: APP_INTERCEPTOR,
            useClass: CacheInterceptor,
        },
    ],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerMiddleware).forRoutes("*");
    }
}
