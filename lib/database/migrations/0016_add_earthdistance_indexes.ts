import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE INDEX IF NOT EXISTS "Stop_earthdistance_idx"
        ON "Stop"
        USING gist (ll_to_earth("avgLatitude", "avgLongitude"))
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "Platform_earthdistance_idx"
        ON "Platform"
        USING gist (ll_to_earth("latitude", "longitude"))
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`DROP INDEX IF EXISTS "Platform_earthdistance_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "Stop_earthdistance_idx"`.execute(db);
}
