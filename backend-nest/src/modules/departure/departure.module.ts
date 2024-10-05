import { Module } from "@nestjs/common";

import { DepartureController } from "src/modules/departure/departure.controller";
import { DepartureService } from "src/modules/departure/departure.service";

@Module({
    controllers: [DepartureController],
    providers: [DepartureService],
    imports: [],
})
export class DepartureModule {}
