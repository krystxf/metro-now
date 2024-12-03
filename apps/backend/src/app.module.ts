import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ScheduleModule } from "@nestjs/schedule";

import { cacheModuleConfig } from "src/config/cache-module.config";
import { configModuleConfig } from "src/config/config-module.config";
import { GRAPHQL_PATH } from "src/constants/api";
import { DepartureModule } from "src/modules/departure/departure.module";
import { ImportModule } from "src/modules/import/import.module";
import { LoggerModule } from "src/modules/logger/logger.module";
import { PlatformModule } from "src/modules/platform/platform.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { StatusModule } from "src/modules/status/status.module";
import { StopModule } from "src/modules/stop/stop.module";

@Module({
    imports: [
        PlatformModule,
        DepartureModule,
        ImportModule,
        StopModule,
        PrismaModule,
        LoggerModule,
        StatusModule,
        ConfigModule.forRoot(configModuleConfig),
        ScheduleModule.forRoot(),
        CacheModule.registerAsync(cacheModuleConfig),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            playground: true,
            autoSchemaFile: "schema.gql",
            path: GRAPHQL_PATH,
        }),
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
