import { Module } from "@nestjs/common";

import { RoutesByPlatformIdLoaderModule } from "src/modules/dataloader/RoutesByPlatformIdLoader.module";
import { StopByPlatformLoader } from "src/modules/dataloader/stop-by-platform.loader";
import { PlatformController } from "src/modules/platform/platform.controller";
import { PlatformResolver } from "src/modules/platform/platform.resolver";
import { PlatformService } from "src/modules/platform/platform.service";
import { RouteService } from "src/modules/route/route.service";
import { StopService } from "src/modules/stop/stop.service";

@Module({
    controllers: [PlatformController],
    providers: [
        PlatformResolver,
        PlatformService,
        StopService,
        RouteService,
        StopByPlatformLoader,
    ],
    exports: [PlatformService, StopByPlatformLoader],
    imports: [RoutesByPlatformIdLoaderModule],
})
export class PlatformModule {}
