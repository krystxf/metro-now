import { Module } from "@nestjs/common";

import { DataloaderModule } from "src/modules/dataloader/dataloader.module";
import { StopDataModule } from "src/modules/stop/stop-data.module";
import { StopController } from "src/modules/stop/stop.controller";
import { StopResolver } from "src/modules/stop/stop.resolver";

@Module({
    controllers: [StopController],
    providers: [StopResolver],
    imports: [DataloaderModule, StopDataModule],
})
export class StopModule {}
