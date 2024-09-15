import { Module } from "@nestjs/common";

import { StopService } from "src/modules/stop/stop.service";
import { StopController } from "src/modules/stop/stop.controller";

@Module({
    controllers: [StopController],
    providers: [StopService],
    imports: [],
})
export class StopModule {}
