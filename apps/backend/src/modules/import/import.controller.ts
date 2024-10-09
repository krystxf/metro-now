import { Controller, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { LogMessage, LogType, StopSyncTrigger } from "src/enums/log.enum";
import { ImportService } from "src/modules/import/import.service";
import { PrismaService } from "src/modules/prisma/prisma.service";

@Controller("import")
export class ImportController implements OnModuleInit {
    constructor(
        private readonly importService: ImportService,
        private readonly prismaService: PrismaService,
    ) {}

    async onModuleInit() {
        console.log("Starting initial stop sync");

        this.syncStops(StopSyncTrigger.INIT);
    }

    @Cron(CronExpression.EVERY_7_HOURS)
    async cronSyncStops(): Promise<void> {
        console.log("Starting scheduled stop sync");

        this.syncStops(StopSyncTrigger.CRON);
    }

    async syncStops(trigger: StopSyncTrigger): Promise<void> {
        const start = Date.now();

        try {
            await this.importService.syncStops();

            await this.prismaService.log.create({
                data: {
                    type: LogType.INFO,
                    message: LogMessage.IMPORT_STOPS,
                    duration: Date.now() - start,
                    description: `Trigger: ${trigger};`,
                },
            });
        } catch (error) {
            await this.prismaService.log.create({
                data: {
                    type: LogType.ERROR,
                    message: LogMessage.IMPORT_STOPS,
                    duration: Date.now() - start,
                    description: `Trigger: ${trigger}; Error: ${error}`,
                },
            });
        } finally {
            console.log("Finished stop sync");
        }
    }
}
