import { Module } from "@nestjs/common";

import { StopController } from "./stop.controller";
import { StopService } from "./stop.service";

@Module({
    controllers: [StopController],
    providers: [StopService],
    imports: [],
})
export class StopModule {}
