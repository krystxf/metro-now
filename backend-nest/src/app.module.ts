import { Module } from "@nestjs/common";
import { CacheInterceptor, CacheModule } from "@nestjs/cache-manager";
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
import { ImportController } from "./modules/import/import.controller";
import { ImportService } from "./modules/import/import.service";

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
        PlatformController,
        DepartureController,
        StopController,
        ImportController,
    ],
    providers: [
        PrismaService,
        PlatformService,
        DepartureService,
        StopService,
        ImportService,
        {
            provide: APP_INTERCEPTOR,
            useClass: CacheInterceptor,
        },
    ],
})
export class AppModule {}
