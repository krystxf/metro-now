import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS "RequestLog" (
            "id" TEXT NOT NULL,
            "method" TEXT NOT NULL,
            "path" TEXT NOT NULL,
            "statusCode" INTEGER NOT NULL,
            "durationMs" INTEGER NOT NULL,
            "cached" BOOLEAN NOT NULL DEFAULT FALSE,
            "userAgent" TEXT,
            "appVersion" TEXT,
            "headers" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
        )
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "RequestLog_path_createdAt_idx"
        ON "RequestLog"("path", "createdAt")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "RequestLog_createdAt_idx"
        ON "RequestLog"("createdAt")
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`DROP TABLE IF EXISTS "RequestLog" CASCADE`.execute(db);
}
