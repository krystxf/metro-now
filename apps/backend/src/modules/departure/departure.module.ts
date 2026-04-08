import { Module } from "@nestjs/common";

import { RoutesByPlatformIdLoaderModule } from "src/modules/dataloader/RoutesByPlatformIdLoader.module";
import { DataloaderModule } from "src/modules/dataloader/dataloader.module";
import { DepartureBoardService } from "src/modules/departure/departure-board.service";
import { DepartureServiceV1 } from "src/modules/departure/departure-v1.service";
import { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";
import { DepartureController } from "src/modules/departure/departure.controller";
import { DepartureResolver } from "src/modules/departure/departure.resolver";
import { GolemioModule } from "src/modules/golemio/golemio.module";

@Module({
    controllers: [DepartureController],
    providers: [
        DepartureBoardService,
        DepartureServiceV1,
        DepartureServiceV2,
        DepartureResolver,
    ],
    imports: [GolemioModule, DataloaderModule, RoutesByPlatformIdLoaderModule],
})
export class DepartureModule {}
