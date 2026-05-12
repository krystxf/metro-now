import type { Kysely } from "kysely";
import { sql } from "kysely";

const TABLES_WITH_RAW_DATA = [
    "GtfsTrip",
    "GtfsStopTime",
    "GtfsCalendar",
    "GtfsCalendarDate",
    "GtfsTransfer",
] as const;

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    for (const table of TABLES_WITH_RAW_DATA) {
        await sql`ALTER TABLE ${sql.ref(table)} DROP COLUMN IF EXISTS "rawData"`.execute(
            db,
        );
    }
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    for (const table of TABLES_WITH_RAW_DATA) {
        await sql`ALTER TABLE ${sql.ref(table)} ADD COLUMN IF NOT EXISTS "rawData" JSONB NOT NULL DEFAULT '{}'::jsonb`.execute(
            db,
        );
    }
}
