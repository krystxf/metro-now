import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        ALTER TABLE "Stop"
        ADD COLUMN IF NOT EXISTS "feed" "GtfsFeedId"
    `.execute(db);

    await sql`
        UPDATE "Stop"
        SET "feed" = CASE
            WHEN "id" LIKE 'BRS:%' THEN 'BRNO'::"GtfsFeedId"
            WHEN "id" LIKE 'BTS:%' THEN 'BRATISLAVA'::"GtfsFeedId"
            WHEN "id" LIKE 'LBS:%' THEN 'LIBEREC'::"GtfsFeedId"
            WHEN "id" LIKE 'PMS:%' THEN 'PMDP'::"GtfsFeedId"
            WHEN "id" LIKE 'TLS:%' THEN 'LEO'::"GtfsFeedId"
            WHEN "id" LIKE 'USS:%' THEN 'USTI'::"GtfsFeedId"
            WHEN "id" LIKE 'ZRS:%' THEN 'ZSR'::"GtfsFeedId"
            ELSE 'PID'::"GtfsFeedId"
        END
        WHERE "feed" IS NULL
    `.execute(db);

    await sql`
        ALTER TABLE "Stop"
        ALTER COLUMN "feed" SET NOT NULL
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        ALTER TABLE "Stop"
        DROP COLUMN IF EXISTS "feed"
    `.execute(db);
}
