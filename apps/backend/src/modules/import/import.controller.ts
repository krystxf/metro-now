import { Controller, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { StopSyncTrigger } from "src/enums/log.enum";
import { ImportService } from "src/modules/import/import.service";

@Controller("import")
export class ImportController implements OnModuleInit {
    constructor(private readonly importService: ImportService) {}

    async onModuleInit() {
        return this.importService.syncStops(StopSyncTrigger.INIT);
    }

    @Cron(CronExpression.EVERY_7_HOURS)
    async cronSyncStops(): Promise<void> {
        return this.importService.syncStops(StopSyncTrigger.CRON);
    }
}
