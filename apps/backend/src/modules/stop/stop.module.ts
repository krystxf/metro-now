import { Module } from "@nestjs/common";

import { DataloaderModule } from "src/modules/dataloader/dataloader.module";
import { PlatformService } from "src/modules/platform/platform.service";
import { StopController } from "src/modules/stop/stop.controller";
import { StopResolver } from "src/modules/stop/stop.resolver";
import { StopService } from "src/modules/stop/stop.service";

@Module({
    controllers: [StopController],
    providers: [PlatformService, StopResolver, StopService],
    imports: [DataloaderModule],
})
export class StopModule {}
