import { MiddlewareConsumer, Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MetroController } from "./controllers/metro/metro.controller";
import { ConfigModule } from "@nestjs/config";
import { RequestLoggerMiddleware } from "./middleware/request-logger.middleware";
import { TTL } from "./constants/constants";
import { ScheduleModule } from "@nestjs/schedule";
import { SyncStopsService } from "./services/sync-stops.service";
import { PrismaService } from "./services/prisma.service";
import { StopController } from "./controllers/stop/stop.controller";

@Module({
    imports: [
        ConfigModule.forRoot(),
        ScheduleModule.forRoot(),
        CacheModule.register({
            isGlobal: true,
            ttl: TTL,
        }),
    ],
    controllers: [AppController, MetroController, StopController],
    providers: [AppService, PrismaService, SyncStopsService],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerMiddleware).forRoutes("*");
    }
}
