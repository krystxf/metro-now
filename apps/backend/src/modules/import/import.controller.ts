import { Controller, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { Environment } from "src/enums/environment.enum";
import { GtfsService } from "src/modules/import/gtfs.service";
import { ImportService } from "src/modules/import/import.service";

@Controller("import")
export class ImportController implements OnModuleInit {
    constructor(
        private readonly importService: ImportService,
        private readonly gtfsService: GtfsService,
    ) {}

    async syncEverything(): Promise<void> {
        console.log("syncing everything");
        await this.importService.syncStops();
        await this.gtfsService.syncGtfsData();
        console.log("syncing everything done");
    }

    async onModuleInit(): Promise<void> {
        const importPromise = this.syncEverything();

        if (process.env.NODE_ENV === Environment.TEST) {
            await importPromise;
        }
    }

    @Cron(CronExpression.EVERY_7_HOURS)
    async cronSyncStops(): Promise<void> {
        this.syncEverything();
    }
}
