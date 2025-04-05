import { Controller, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { Environment } from "src/enums/environment.enum";
import { ImportService } from "src/modules/import/import.service";

@Controller("import")
export class ImportController implements OnModuleInit {
    constructor(private readonly importService: ImportService) {}

    async onModuleInit(): Promise<void> {
        const importPromise = this.importService.syncStops();

        if (process.env.NODE_ENV === Environment.TEST) {
            await importPromise;
        }
    }

    @Cron(CronExpression.EVERY_7_HOURS)
    async cronSyncStops(): Promise<void> {
        return this.importService.syncStops();
    }
}
