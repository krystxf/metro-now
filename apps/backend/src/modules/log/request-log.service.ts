import { type NewRequestLog } from "@metro-now/database";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";

import { SerializedWriter } from "src/common/serialized-writer";

import { DatabaseService } from "src/modules/database/database.service";

@Injectable()
export class RequestLogService implements OnModuleDestroy {
    private readonly writer = new SerializedWriter();

    constructor(private readonly database: DatabaseService) {}

    log(entry: Omit<NewRequestLog, "id" | "createdAt">): void {
        const logEntry: NewRequestLog = {
            ...entry,
            createdAt: new Date(),
        };

        this.writer.enqueue(
            () =>
                this.database.db
                    .insertInto("RequestLog")
                    .values(logEntry)
                    .execute(),
            ({ cause }) => {
                console.error("Failed to write request log", {
                    error:
                        cause instanceof Error ? cause.message : String(cause),
                });
            },
        );
    }

    async flush(): Promise<void> {
        await this.writer.flush();
    }

    async onModuleDestroy() {
        await this.flush();
    }
}
