import { Controller, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { GtfsService } from "src/modules/gtfs/gtfs.service";

@Controller("gtfs")
export class GtfsController implements OnModuleInit {
    constructor(private readonly gtfsService: GtfsService) {}

    async onModuleInit(): Promise<void> {
        try {
            this.gtfsService.syncGtfsData();
        } catch (error) {
            console.error(error);
        }
    }

    @Cron(CronExpression.EVERY_7_HOURS)
    async cronSyncStops(): Promise<void> {
        try {
            await this.gtfsService.syncGtfsData();
        } catch (error) {
            console.error(error);
        }
    }
}
