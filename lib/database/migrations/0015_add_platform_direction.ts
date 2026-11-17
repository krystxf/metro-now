import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        ALTER TABLE "Platform"
        ADD COLUMN IF NOT EXISTS "direction" TEXT
    `.execute(db);

    await sql`
        UPDATE "Platform" p
        SET "direction" = bd.next_stop_name,
            "updatedAt" = now()
        FROM (
            SELECT DISTINCT ON (o.platform_id)
                o.platform_id,
                s."name" AS next_stop_name
            FROM (
                SELECT
                    st."platformId" AS platform_id,
                    st."stopId" AS current_stop_id,
                    LEAD(st."stopId") OVER (
                        PARTITION BY st."feedId", st."tripId"
                        ORDER BY st."stopSequence"
                    ) AS next_stop_id
                FROM "GtfsStopTime" st
                WHERE st."platformId" IS NOT NULL
            ) o
            JOIN "Stop" s ON s."id" = o.next_stop_id
            WHERE o.next_stop_id IS NOT NULL
              AND o.next_stop_id <> o.current_stop_id
            GROUP BY o.platform_id, s."name"
            ORDER BY o.platform_id, COUNT(*) DESC, s."name" ASC
        ) bd
        WHERE p."id" = bd.platform_id
          AND p."direction" IS DISTINCT FROM bd.next_stop_name
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        ALTER TABLE "Platform"
        DROP COLUMN IF EXISTS "direction"
    `.execute(db);
}
