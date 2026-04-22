import { Module } from "@nestjs/common";

import { StopRepository } from "src/modules/stop/stop.repository";
import { StopService } from "src/modules/stop/stop.service";

@Module({
    providers: [StopRepository, StopService],
    exports: [StopRepository, StopService],
})
export class StopDataModule {}
