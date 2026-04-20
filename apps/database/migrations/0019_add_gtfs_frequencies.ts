import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsFrequency" (
            "id" TEXT NOT NULL,
            "feedId" TEXT NOT NULL,
            "tripId" TEXT NOT NULL,
            "startTime" TEXT NOT NULL,
            "endTime" TEXT NOT NULL,
            "headwaySecs" INTEGER NOT NULL,
            "exactTimes" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "GtfsFrequency_pkey" PRIMARY KEY ("id")
        )
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsFrequency_feedId_tripId_idx"
        ON "GtfsFrequency"("feedId", "tripId")
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`DROP TABLE IF EXISTS "GtfsFrequency" CASCADE`.execute(db);
}
