import { Module } from "@nestjs/common";

import { DataloaderModule } from "src/modules/dataloader/dataloader.module";
import { StopController } from "src/modules/stop/legacy/stop.controller";
import { StopDataModule } from "src/modules/stop/stop-data.module";
import {
    StopResolver,
    StopWithDistanceResolver,
} from "src/modules/stop/stop.resolver";

@Module({
    controllers: [StopController],
    providers: [StopResolver, StopWithDistanceResolver],
    imports: [DataloaderModule, StopDataModule],
})
export class StopModule {}
