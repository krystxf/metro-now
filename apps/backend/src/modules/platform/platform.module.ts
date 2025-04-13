import { Module } from "@nestjs/common";

import { PlatformController } from "src/modules/platform/platform.controller";
import { PlatformResolver } from "src/modules/platform/platform.resolver";
import { PlatformService } from "src/modules/platform/platform.service";
import { RouteService } from "src/modules/route/route.service";
import { StopService } from "src/modules/stop/stop.service";

@Module({
    controllers: [PlatformController],
    providers: [PlatformResolver, PlatformService, StopService, RouteService],
    imports: [],
})
export class PlatformModule {}
