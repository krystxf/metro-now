import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ADD COLUMN IF NOT EXISTS "feedId" "GtfsFeedId"
    `.execute(db);

    await sql`
        UPDATE "PlatformsOnRoutes" p
        SET "feedId" = gr."feedId"
        FROM "GtfsRoute" gr
        WHERE gr."id" = p."routeId"
          AND p."feedId" IS NULL
    `.execute(db);

    await sql`
        DELETE FROM "PlatformsOnRoutes"
        WHERE "feedId" IS NULL
    `.execute(db);

    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ALTER COLUMN "feedId" SET NOT NULL
    `.execute(db);

    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        DROP CONSTRAINT IF EXISTS "PlatformsOnRoutes_routeId_fkey"
    `.execute(db);

    await sql`
        DROP INDEX IF EXISTS "PlatformsOnRoutes_platformId_routeId_key"
    `.execute(db);

    await sql`
        DROP INDEX IF EXISTS "PlatformsOnRoutes_routeId_idx"
    `.execute(db);

    await sql`
        CREATE UNIQUE INDEX "PlatformsOnRoutes_platformId_feedId_routeId_key"
        ON "PlatformsOnRoutes"("platformId", "feedId", "routeId")
    `.execute(db);

    await sql`
        CREATE INDEX "PlatformsOnRoutes_feedId_routeId_idx"
        ON "PlatformsOnRoutes"("feedId", "routeId")
    `.execute(db);

    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ADD CONSTRAINT "PlatformsOnRoutes_feedId_routeId_fkey"
        FOREIGN KEY ("feedId", "routeId")
        REFERENCES "GtfsRoute"("feedId", "id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    `.execute(db);

    await sql`DROP TABLE IF EXISTS "Route"`.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE TABLE "Route" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "vehicleType" "VehicleType",
            "isNight" BOOLEAN,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
        )
    `.execute(db);

    await sql`
        INSERT INTO "Route" ("id", "name", "vehicleType", "isNight", "createdAt", "updatedAt")
        SELECT DISTINCT ON (gr."id")
            gr."id",
            gr."shortName",
            gr."vehicleType",
            gr."isNight",
            gr."createdAt",
            gr."updatedAt"
        FROM "GtfsRoute" gr
        JOIN "PlatformsOnRoutes" p
          ON p."feedId" = gr."feedId" AND p."routeId" = gr."id"
        ORDER BY gr."id", gr."feedId"
    `.execute(db);

    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        DROP CONSTRAINT IF EXISTS "PlatformsOnRoutes_feedId_routeId_fkey"
    `.execute(db);

    await sql`
        DROP INDEX IF EXISTS "PlatformsOnRoutes_platformId_feedId_routeId_key"
    `.execute(db);

    await sql`
        DROP INDEX IF EXISTS "PlatformsOnRoutes_feedId_routeId_idx"
    `.execute(db);

    await sql`
        CREATE UNIQUE INDEX "PlatformsOnRoutes_platformId_routeId_key"
        ON "PlatformsOnRoutes"("platformId", "routeId")
    `.execute(db);

    await sql`
        CREATE INDEX "PlatformsOnRoutes_routeId_idx"
        ON "PlatformsOnRoutes"("routeId")
    `.execute(db);

    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        ADD CONSTRAINT "PlatformsOnRoutes_routeId_fkey"
        FOREIGN KEY ("routeId")
        REFERENCES "Route"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    `.execute(db);

    await sql`
        ALTER TABLE "PlatformsOnRoutes"
        DROP COLUMN IF EXISTS "feedId"
    `.execute(db);
}
