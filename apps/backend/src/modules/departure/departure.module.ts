import { Module } from "@nestjs/common";

import { DepartureServiceV1 } from "src/modules/departure/departure-v1.service";
import { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";
import { DepartureController } from "src/modules/departure/departure.controller";
import { DepartureResolver } from "src/modules/departure/departure.resolver";
import { GolemioService } from "src/modules/golemio/golemio.service";
import { PlatformService } from "src/modules/platform/platform.service";
import { RouteService } from "src/modules/route/route.service";

@Module({
    controllers: [DepartureController],
    providers: [
        DepartureServiceV1,
        DepartureServiceV2,
        DepartureResolver,
        PlatformService,
        GolemioService,
        RouteService,
    ],
    imports: [],
})
export class DepartureModule {}
