import { Controller, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ImportService } from "./import.service";

@Controller("import")
export class ImportController implements OnModuleInit {
    constructor(private readonly importService: ImportService) {}

    async onModuleInit() {
        console.log("Starting initial stop sync");
        this.syncStops();
    }

    @Cron(CronExpression.EVERY_7_HOURS)
    async cronSyncStops(): Promise<void> {
        console.log("Starting scheduled stop sync");
        this.syncStops();
    }

    async syncStops(): Promise<void> {
        try {
            await this.importService.syncStops();
            console.log("Scheduled stop sync completed successfully");
        } catch (error) {
            console.error("Error during scheduled stop sync:", error);
        }
    }
}
