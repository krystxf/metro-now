import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ScheduleModule } from "@nestjs/schedule";

import { formatGraphQLError } from "src/common/graphql-error";
import { cacheModuleConfig } from "src/config/cache-module.config";
import { configModuleConfig } from "src/config/config-module.config";
import { GRAPHQL_PATH } from "src/constants/api";
import { DepartureModule } from "src/modules/departure/departure.module";
import { HelloModule } from "src/modules/hello/hello.module";
import { ImportModule } from "src/modules/import/import.module";
import { InfotextsModule } from "src/modules/infotexts/infotexts.module";
import { PlatformModule } from "src/modules/platform/platform.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { RouteModule } from "src/modules/route/route.module";
import { StatusModule } from "src/modules/status/status.module";
import { StopModule } from "src/modules/stop/stop.module";

@Module({
    imports: [
        PlatformModule,
        DepartureModule,
        ImportModule,
        InfotextsModule,
        StopModule,
        PrismaModule,
        StatusModule,
        RouteModule,
        ConfigModule.forRoot(configModuleConfig),
        ScheduleModule.forRoot(),
        CacheModule.registerAsync(cacheModuleConfig),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            playground: true,
            typePaths: ["./**/*.graphql"],
            path: GRAPHQL_PATH,
            autoTransformHttpErrors: true,
            formatError: formatGraphQLError,

            // useFactory: (dataloaderService: DataloaderService) => {
            //     return {
            //         autoSchemaFile: true,
            //         context: () => ({
            //             loaders: dataloaderService.getLoaders(),
            //         }),
            //     };
            // },
        }),
        HelloModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
