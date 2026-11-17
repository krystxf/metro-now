import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        ALTER TABLE "GtfsRoute" ADD COLUMN IF NOT EXISTS "vehicleType" TEXT
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`ALTER TABLE "GtfsRoute" DROP COLUMN IF EXISTS "vehicleType"`.execute(
        db,
    );
}
