import { Module } from "@nestjs/common";
import { CacheInterceptor, CacheModule } from "@nestjs/cache-manager";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { TTL_DEFAULT } from "./constants/constants";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaService } from "./database/prisma.service";
import { PlatformController } from "./modules/platform/platform.controller";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PlatformService } from "./modules/platform/platform.service";
import { DepartureController } from "./modules/departure/departure.controller";
import { DepartureService } from "./modules/departure/departure.service";
import { StopService } from "./modules/stop/stop.service";
import { StopController } from "./modules/stop/stop.controller";

@Module({
    imports: [
        ConfigModule.forRoot(),
        ScheduleModule.forRoot(),
        CacheModule.register({
            isGlobal: true,
            ttl: TTL_DEFAULT,
        }),
    ],
    controllers: [
        AppController,
        PlatformController,
        DepartureController,
        StopController,
    ],
    providers: [
        AppService,
        PrismaService,
        PlatformService,
        DepartureService,
        StopService,
        {
            provide: APP_INTERCEPTOR,
            useClass: CacheInterceptor,
        },
    ],
})
export class AppModule {}
