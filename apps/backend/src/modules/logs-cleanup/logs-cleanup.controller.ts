import { Controller, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { LogsCleanupService } from "src/modules/logs-cleanup/logs-cleanup.service";

@Controller("logs-cleanup")
export class LogsCleanupController implements OnModuleInit {
    constructor(private readonly logsCleanupService: LogsCleanupService) {}

    async onModuleInit(): Promise<void> {
        return this.logsCleanupService.cleanupLogs();
    }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async cronLogsCleanup(): Promise<void> {
        return this.logsCleanupService.cleanupLogs();
    }
}
