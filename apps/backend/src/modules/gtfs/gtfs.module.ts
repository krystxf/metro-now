import { Module } from "@nestjs/common";

import { GtfsController } from "src/modules/gtfs/gtfs.controller";
import { GtfsService } from "src/modules/gtfs/gtfs.service";

@Module({
    controllers: [GtfsController],
    providers: [GtfsService],
    imports: [],
})
export class GtfsModule {}
