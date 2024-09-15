import { Module } from "@nestjs/common";

import { DepartureService } from "src/modules/departure/departure.service";
import { DepartureController } from "src/modules/departure/departure.controller";

@Module({
    controllers: [DepartureController],
    providers: [DepartureService],
    imports: [],
})
export class DepartureModule {}
