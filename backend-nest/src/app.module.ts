import { Module } from "@nestjs/common";
import { CacheInterceptor, CacheModule } from "@nestjs/cache-manager";
import { ConfigModule } from "@nestjs/config";
import { TTL_DEFAULT } from "src/constants/constants";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { PlatformModule } from "src/modules/platform/platform.module";
import { DepartureModule } from "src/modules/departure/departure.module";
import { ImportModule } from "src/modules/import/import.module";
import { StopModule } from "src/modules/stop/stop.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";

@Module({
    imports: [
        PrismaModule,
        PlatformModule,
        DepartureModule,
        ImportModule,
        StopModule,
        ConfigModule.forRoot(),
        ScheduleModule.forRoot(),
        CacheModule.register({
            isGlobal: true,
            ttl: TTL_DEFAULT,
        }),
    ],
    controllers: [],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: CacheInterceptor,
        },
    ],
})
export class AppModule {}
