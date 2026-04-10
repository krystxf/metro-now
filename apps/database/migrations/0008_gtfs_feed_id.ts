import type { Kysely } from "kysely";
import { sql } from "kysely";

const TIMETABLE_TABLES = [
    "GtfsTrip",
    "GtfsStopTime",
    "GtfsCalendar",
    "GtfsCalendarDate",
    "GtfsTransfer",
] as const;

const ROUTE_TABLES = [
    "GtfsRoute",
    "GtfsRouteStop",
    "GtfsRouteShape",
    "GtfsStationEntrance",
] as const;

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        DO $$ BEGIN
            CREATE TYPE "GtfsFeedId" AS ENUM ('PID', 'BRNO', 'BRATISLAVA', 'LEO', 'LIBEREC', 'PMDP', 'USTI');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$
    `.execute(db);

    for (const table of TIMETABLE_TABLES) {
        await sql`
            ALTER TABLE ${sql.ref(table)}
            ALTER COLUMN "feedId" TYPE "GtfsFeedId"
            USING "feedId"::"GtfsFeedId"
        `.execute(db);
    }

    for (const table of ROUTE_TABLES) {
        await sql`ALTER TABLE ${sql.ref(table)} ADD COLUMN IF NOT EXISTS "feedId" "GtfsFeedId"`.execute(
            db,
        );
    }

    await sql`UPDATE "GtfsRoute" SET "feedId" = 'PID' WHERE "feedId" IS NULL`.execute(
        db,
    );
    await sql`UPDATE "GtfsRouteStop" SET "feedId" = 'PID' WHERE "feedId" IS NULL`.execute(
        db,
    );
    await sql`UPDATE "GtfsRouteShape" SET "feedId" = 'PID' WHERE "feedId" IS NULL`.execute(
        db,
    );
    await sql`UPDATE "GtfsStationEntrance" SET "feedId" = 'PID' WHERE "feedId" IS NULL`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRoute" ALTER COLUMN "feedId" SET NOT NULL`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteStop" ALTER COLUMN "feedId" SET NOT NULL`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" ALTER COLUMN "feedId" SET NOT NULL`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsStationEntrance" ALTER COLUMN "feedId" SET NOT NULL`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRouteStop" DROP CONSTRAINT IF EXISTS "GtfsRouteStop_routeId_fkey"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" DROP CONSTRAINT IF EXISTS "GtfsRouteShape_routeId_fkey"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" DROP CONSTRAINT IF EXISTS "GtfsRouteShape_routeId_directionId_shapeId_unique"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRoute" DROP CONSTRAINT IF EXISTS "GtfsRoute_pkey"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsStationEntrance" DROP CONSTRAINT IF EXISTS "GtfsStationEntrance_pkey"`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRouteStop" DROP CONSTRAINT IF EXISTS "GtfsRouteStop_pkey"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteStop" DROP COLUMN "id"`.execute(db);
    await sql`ALTER TABLE "GtfsRouteStop" ADD COLUMN "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRouteShape" DROP CONSTRAINT IF EXISTS "GtfsRouteShape_pkey"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" DROP COLUMN "id"`.execute(db);
    await sql`ALTER TABLE "GtfsRouteShape" ADD COLUMN "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRoute" ADD CONSTRAINT "GtfsRoute_pkey" PRIMARY KEY ("feedId", "id")`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsStationEntrance" ADD CONSTRAINT "GtfsStationEntrance_pkey" PRIMARY KEY ("feedId", "id")`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" ADD CONSTRAINT "GtfsRouteShape_routeId_directionId_shapeId_unique" UNIQUE ("feedId", "routeId", "directionId", "shapeId")`.execute(
        db,
    );

    await sql`DROP INDEX IF EXISTS "GtfsRouteStop_routeId_directionId_stopId_stopSequence_key"`.execute(
        db,
    );
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "GtfsRouteStop_feed_route_direction_stop_sequence_key"
        ON "GtfsRouteStop"("feedId", "routeId", "directionId", "stopId", "stopSequence")`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRouteStop"
        ADD CONSTRAINT "GtfsRouteStop_feed_route_fkey"
        FOREIGN KEY ("feedId", "routeId")
        REFERENCES "GtfsRoute"("feedId", "id")
        ON DELETE CASCADE
        ON UPDATE CASCADE`.execute(db);
    await sql`ALTER TABLE "GtfsRouteShape"
        ADD CONSTRAINT "GtfsRouteShape_feed_route_fkey"
        FOREIGN KEY ("feedId", "routeId")
        REFERENCES "GtfsRoute"("feedId", "id")
        ON DELETE CASCADE
        ON UPDATE CASCADE`.execute(db);

    await sql`CREATE INDEX IF NOT EXISTS "GtfsRoute_feedId_idx" ON "GtfsRoute"("feedId")`.execute(
        db,
    );
    await sql`CREATE INDEX IF NOT EXISTS "GtfsRouteStop_feedId_idx" ON "GtfsRouteStop"("feedId")`.execute(
        db,
    );
    await sql`CREATE INDEX IF NOT EXISTS "GtfsRouteShape_feedId_idx" ON "GtfsRouteShape"("feedId")`.execute(
        db,
    );
    await sql`CREATE INDEX IF NOT EXISTS "GtfsStationEntrance_feedId_idx" ON "GtfsStationEntrance"("feedId")`.execute(
        db,
    );
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`ALTER TABLE "GtfsRouteStop" DROP CONSTRAINT IF EXISTS "GtfsRouteStop_feed_route_fkey"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" DROP CONSTRAINT IF EXISTS "GtfsRouteShape_feed_route_fkey"`.execute(
        db,
    );
    await sql`DROP INDEX IF EXISTS "GtfsRouteStop_feed_route_direction_stop_sequence_key"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" DROP CONSTRAINT IF EXISTS "GtfsRouteShape_routeId_directionId_shapeId_unique"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRoute" DROP CONSTRAINT IF EXISTS "GtfsRoute_pkey"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsStationEntrance" DROP CONSTRAINT IF EXISTS "GtfsStationEntrance_pkey"`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRouteStop" DROP COLUMN "id"`.execute(db);
    await sql`ALTER TABLE "GtfsRouteStop" ADD COLUMN "id" TEXT NOT NULL DEFAULT gen_random_uuid()`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteStop" ADD CONSTRAINT "GtfsRouteStop_pkey" PRIMARY KEY ("id")`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRouteShape" DROP COLUMN "id"`.execute(db);
    await sql`ALTER TABLE "GtfsRouteShape" ADD COLUMN "id" TEXT NOT NULL DEFAULT gen_random_uuid()`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" ADD CONSTRAINT "GtfsRouteShape_pkey" PRIMARY KEY ("id")`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRoute" ADD CONSTRAINT "GtfsRoute_pkey" PRIMARY KEY ("id")`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsStationEntrance" ADD CONSTRAINT "GtfsStationEntrance_pkey" PRIMARY KEY ("id")`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" ADD CONSTRAINT "GtfsRouteShape_routeId_directionId_shapeId_unique" UNIQUE ("routeId", "directionId", "shapeId")`.execute(
        db,
    );
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "GtfsRouteStop_routeId_directionId_stopId_stopSequence_key"
        ON "GtfsRouteStop"("routeId", "directionId", "stopId", "stopSequence")`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRouteStop"
        ADD CONSTRAINT "GtfsRouteStop_routeId_fkey"
        FOREIGN KEY ("routeId")
        REFERENCES "GtfsRoute"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE`.execute(db);
    await sql`ALTER TABLE "GtfsRouteShape"
        ADD CONSTRAINT "GtfsRouteShape_routeId_fkey"
        FOREIGN KEY ("routeId")
        REFERENCES "GtfsRoute"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE`.execute(db);

    await sql`DROP INDEX IF EXISTS "GtfsRoute_feedId_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "GtfsRouteStop_feedId_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "GtfsRouteShape_feedId_idx"`.execute(db);
    await sql`DROP INDEX IF EXISTS "GtfsStationEntrance_feedId_idx"`.execute(
        db,
    );

    await sql`ALTER TABLE "GtfsRoute" DROP COLUMN IF EXISTS "feedId"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteStop" DROP COLUMN IF EXISTS "feedId"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsRouteShape" DROP COLUMN IF EXISTS "feedId"`.execute(
        db,
    );
    await sql`ALTER TABLE "GtfsStationEntrance" DROP COLUMN IF EXISTS "feedId"`.execute(
        db,
    );

    for (const table of TIMETABLE_TABLES) {
        await sql`
            ALTER TABLE ${sql.ref(table)}
            ALTER COLUMN "feedId" TYPE TEXT
        `.execute(db);
    }

    await sql`DROP TYPE IF EXISTS "GtfsFeedId"`.execute(db);
}
