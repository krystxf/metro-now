import { Module } from "@nestjs/common";

import { PlatformService } from "src/modules/platform/platform.service";
import { StopController } from "src/modules/stop/stop.controller";
import { StopResolver } from "src/modules/stop/stop.resolver";
import { StopService } from "src/modules/stop/stop.service";

@Module({
    controllers: [StopController],
    providers: [PlatformService, StopResolver, StopService],
    imports: [],
})
export class StopModule {}
