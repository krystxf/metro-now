import { type DatabaseClient, sql } from "@metro-now/database";
import { createDatabaseClient } from "@metro-now/shared";
import {
    Injectable,
    type OnModuleDestroy,
    type OnModuleInit,
} from "@nestjs/common";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    readonly db: DatabaseClient;

    constructor() {
        this.db = createDatabaseClient({
            env: process.env,
        });
    }

    async onModuleInit() {
        await sql`SELECT 1`.execute(this.db);
    }

    async onModuleDestroy() {
        await this.db.destroy();
    }

    async getExtensionNames(): Promise<string[]> {
        const result = await sql<{ extname: string }>`
            SELECT extname
            FROM pg_extension
            ORDER BY extname
        `.execute(this.db);

        return result.rows.map(({ extname }) => extname);
    }
}
