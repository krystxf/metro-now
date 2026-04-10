import { type NewRequestLog } from "@metro-now/database";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";

import { DatabaseService } from "src/modules/database/database.service";

@Injectable()
export class RequestLogService implements OnModuleDestroy {
    private pendingWrite: Promise<void> = Promise.resolve();

    constructor(private readonly database: DatabaseService) {}

    log(entry: Omit<NewRequestLog, "id" | "createdAt">): void {
        const logEntry: NewRequestLog = {
            ...entry,
            createdAt: new Date(),
        };

        this.pendingWrite = this.pendingWrite
            .then(async () => {
                await this.database.db
                    .insertInto("RequestLog")
                    .values(logEntry)
                    .execute();
            })
            .catch((error) => {
                console.error("Failed to write request log", {
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            });
    }

    async flush(): Promise<void> {
        await this.pendingWrite;
    }

    async onModuleDestroy() {
        await this.flush();
    }
}
