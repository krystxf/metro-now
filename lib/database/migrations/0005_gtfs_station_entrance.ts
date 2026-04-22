import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsStationEntrance" (
            "id" TEXT NOT NULL,
            "stopId" TEXT NOT NULL,
            "parentStationId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "latitude" DOUBLE PRECISION NOT NULL,
            "longitude" DOUBLE PRECISION NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "GtfsStationEntrance_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "GtfsStationEntrance_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsStationEntrance_stopId_idx"
        ON "GtfsStationEntrance"("stopId")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsStationEntrance_parentStationId_idx"
        ON "GtfsStationEntrance"("parentStationId")
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`DROP TABLE IF EXISTS "GtfsStationEntrance" CASCADE`.execute(db);
}
