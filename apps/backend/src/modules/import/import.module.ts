import { Module } from "@nestjs/common";

import { GtfsService } from "src/modules/import/gtfs.service";
import { ImportController } from "src/modules/import/import.controller";
import { ImportService } from "src/modules/import/import.service";

@Module({
    controllers: [ImportController],
    providers: [ImportService, GtfsService],
    imports: [],
})
export class ImportModule {}
