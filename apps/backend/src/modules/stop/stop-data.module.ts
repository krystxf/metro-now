import { Module } from "@nestjs/common";

import { StopService } from "src/modules/stop/stop.service";

@Module({
    providers: [StopService],
    exports: [StopService],
})
export class StopDataModule {}
