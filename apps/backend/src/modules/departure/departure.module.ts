import { Module } from "@nestjs/common";

import { DepartureController } from "src/modules/departure/departure.controller";
import { DepartureService } from "src/modules/departure/departure.service";
import { GolemioService } from "src/modules/golemio/golemio.service";

@Module({
    controllers: [DepartureController],
    providers: [DepartureService, GolemioService],
    imports: [],
})
export class DepartureModule {}
