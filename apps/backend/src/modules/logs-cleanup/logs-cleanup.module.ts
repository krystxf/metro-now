import { Module } from "@nestjs/common";

import { LogsCleanupController } from "src/modules/logs-cleanup/logs-cleanup.controller";
import { LogsCleanupService } from "src/modules/logs-cleanup/logs-cleanup.service";

@Module({
    controllers: [LogsCleanupController],
    providers: [LogsCleanupService],
    imports: [],
})
export class LogsCleanupModule {}
