import { Controller, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { GtfsService } from "src/modules/gtfs/gtfs.service";

@Controller("gtfs")
export class GtfsController implements OnModuleInit {
    constructor(private readonly gtfsService: GtfsService) {}

    async onModuleInit(): Promise<void> {
        await this.gtfsService.syncGtfsData();
    }

    @Cron(CronExpression.EVERY_7_HOURS)
    async cronSyncStops(): Promise<void> {
        await this.gtfsService.syncGtfsData();
    }
}
