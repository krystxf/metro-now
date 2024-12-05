import { Injectable } from "@nestjs/common";

import { LogLevel, LogMessage } from "src/enums/log.enum";
import { LoggerService } from "src/modules/logger/logger.service";
import { PrismaService } from "src/modules/prisma/prisma.service";

const MAX_COUNT = 500_000;

@Injectable()
export class LogsCleanupService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: LoggerService,
    ) {}

    async cleanupLogs(): Promise<void> {
        try {
            const recordCount = await this.prisma.requestLog.count();

            if (recordCount < MAX_COUNT) {
                return;
            }

            const last = await this.prisma.requestLog.findFirst({
                orderBy: { createdAt: "desc" },
                skip: MAX_COUNT,
            });

            if (!last) {
                return;
            }

            const { count } = await this.prisma.requestLog.deleteMany({
                where: {
                    createdAt: {
                        lte: last.createdAt,
                    },
                },
            });

            await this.logger.createLog(
                LogLevel.log,
                LogMessage.REQUEST_LOGS_CLEANUP,
                {
                    message: "Successfully removed old logs",
                    count,
                },
            );
        } catch (error) {
            await this.logger.createLog(
                LogLevel.error,
                LogMessage.REQUEST_LOGS_CLEANUP,
                {
                    message: "Failed to cleanup logs",
                    error: JSON.stringify(error),
                },
            );
        }
    }
}
