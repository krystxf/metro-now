import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`ALTER TABLE "Stop" ADD COLUMN IF NOT EXISTS "feed" "GtfsFeedId"`.execute(
        db,
    );

    await sql`UPDATE "Stop" SET "feed" = 'PID' WHERE "feed" IS NULL`.execute(
        db,
    );

    await sql`ALTER TABLE "Stop" ALTER COLUMN "feed" SET NOT NULL`.execute(db);

    await sql`CREATE INDEX IF NOT EXISTS "Stop_feed_idx" ON "Stop"("feed")`.execute(
        db,
    );
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`DROP INDEX IF EXISTS "Stop_feed_idx"`.execute(db);
    await sql`ALTER TABLE "Stop" DROP COLUMN IF EXISTS "feed"`.execute(db);
}
