import type { DatabaseClient, NewLog } from "@metro-now/database";

import type { LogEntry, LogTransport } from "../../utils/logger";

const SERVICE_NAME = "dataloader";

const formatLogStoreError = (error: unknown): string => {
    return error instanceof Error ? error.message : String(error);
};

export class DatabaseLogStore implements LogTransport {
    private pendingWrite: Promise<void> = Promise.resolve();

    constructor(private readonly db: DatabaseClient) {}

    write(entry: LogEntry): Promise<void> {
        this.pendingWrite = this.pendingWrite
            .then(async () => {
                const row: NewLog = {
                    service: SERVICE_NAME,
                    level: entry.level,
                    message: entry.message,
                    context: entry.context,
                    createdAt: entry.createdAt,
                };

                await this.db.insertInto("Log").values(row).execute();
            })
            .catch((error) => {
                console.error(
                    `[${new Date().toISOString()}] [ERROR] Failed to write dataloader log to database`,
                    {
                        error: formatLogStoreError(error),
                    },
                );
            });

        return this.pendingWrite;
    }

    async flush(): Promise<void> {
        await this.pendingWrite;
    }
}
