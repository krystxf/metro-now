import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";

import { formatGraphQLError } from "src/common/graphql-error";
import { cacheModuleConfig } from "src/config/cache-module.config";
import { configModuleConfig } from "src/config/config-module.config";
import { GRAPHQL_PATH } from "src/constants/api";
import { DatabaseModule } from "src/modules/database/database.module";
import { DepartureModule } from "src/modules/departure/departure.module";
import { HelloModule } from "src/modules/hello/hello.module";
import { InfotextsModule } from "src/modules/infotexts/infotexts.module";
import { LogModule } from "src/modules/log/log.module";
import { PlatformModule } from "src/modules/platform/platform.module";
import { RouteModule } from "src/modules/route/route.module";
import { StatusModule } from "src/modules/status/status.module";
import { StopModule } from "src/modules/stop/stop.module";

@Module({
    imports: [
        PlatformModule,
        DepartureModule,
        InfotextsModule,
        StopModule,
        DatabaseModule,
        StatusModule,
        RouteModule,
        LogModule,
        ConfigModule.forRoot(configModuleConfig),
        CacheModule.registerAsync(cacheModuleConfig),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            graphiql: process.env.NODE_ENV !== "production",
            typePaths: ["./src/**/*.graphql", "./dist/**/*.graphql"],
            path: GRAPHQL_PATH,
            autoTransformHttpErrors: true,
            formatError: formatGraphQLError,
        }),
        HelloModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
