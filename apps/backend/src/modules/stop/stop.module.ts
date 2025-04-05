import { Module } from "@nestjs/common";

import { StopController } from "src/modules/stop/stop.controller";
import { StopService } from "src/modules/stop/stop.service";

@Module({
    controllers: [StopController],
    providers: [StopService],
    imports: [],
})
export class StopModule {}
