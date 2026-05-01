import type { DatabaseClient } from "@metro-now/database";

import { logger } from "../../utils/logger";

export type LogRetentionResult = {
    cutoff: Date;
    deletedLogs: number;
    deletedRequestLogs: number;
};

export class LogRetentionService {
    constructor(
        private readonly db: DatabaseClient,
        private readonly retentionDays: number,
    ) {}

    async purgeOldLogs(now: Date = new Date()): Promise<LogRetentionResult> {
        const cutoff = new Date(
            now.getTime() - this.retentionDays * 24 * 60 * 60 * 1000,
        );

        const [logResult, requestLogResult] = await Promise.all([
            this.db
                .deleteFrom("Log")
                .where("createdAt", "<", cutoff)
                .executeTakeFirst(),
            this.db
                .deleteFrom("RequestLog")
                .where("createdAt", "<", cutoff)
                .executeTakeFirst(),
        ]);

        const result: LogRetentionResult = {
            cutoff,
            deletedLogs: Number(logResult.numDeletedRows ?? 0n),
            deletedRequestLogs: Number(requestLogResult.numDeletedRows ?? 0n),
        };

        logger.info("Purged old log rows", {
            retentionDays: this.retentionDays,
            cutoff: result.cutoff.toISOString(),
            deletedLogs: result.deletedLogs,
            deletedRequestLogs: result.deletedRequestLogs,
        });

        return result;
    }
}
