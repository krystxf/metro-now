import { Module } from "@nestjs/common";

import { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import { LeoStopMatcherService } from "src/modules/leo/leo-stop-matcher.service";

@Module({
    providers: [LeoGtfsService, LeoStopMatcherService],
    exports: [LeoGtfsService, LeoStopMatcherService],
})
export class LeoModule {}
