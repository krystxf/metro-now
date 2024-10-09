import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { CacheModule } from "@nestjs/cache-manager";
import {
    MiddlewareConsumer,
    Module,
    NestModule,
    RequestMethod,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ScheduleModule } from "@nestjs/schedule";

import { cacheModuleConfig } from "src/config/cache-module.config";
import { configModuleConfig } from "src/config/config-module.config";
import { GRAPHQL_API_ROOT } from "src/constants/graphql.const";
import { LoggerMiddleware } from "src/middleware/logger.middleware";
import { DepartureModule } from "src/modules/departure/departure.module";
import { ImportModule } from "src/modules/import/import.module";
import { PlatformModule } from "src/modules/platform/platform.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { StopModule } from "src/modules/stop/stop.module";

@Module({
    imports: [
        PlatformModule,
        DepartureModule,
        ImportModule,
        StopModule,
        PrismaModule,
        ConfigModule.forRoot(configModuleConfig),
        ScheduleModule.forRoot(),
        CacheModule.register(cacheModuleConfig),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            playground: true,
            autoSchemaFile: "schema.gql",
            path: GRAPHQL_API_ROOT,
        }),
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes({
            path: "*",
            method: RequestMethod.ALL,
        });
    }
}
