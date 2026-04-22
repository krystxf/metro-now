import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsRouteShape" (
            "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
            "routeId" TEXT NOT NULL,
            "directionId" TEXT NOT NULL,
            "shapeId" TEXT NOT NULL,
            "tripCount" INTEGER NOT NULL,
            "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
            "geoJson" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "GtfsRouteShape_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "GtfsRouteShape_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "GtfsRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "GtfsRouteShape_routeId_directionId_shapeId_unique" UNIQUE ("routeId", "directionId", "shapeId")
        )
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsRouteShape_routeId_idx"
        ON "GtfsRouteShape"("routeId")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsRouteShape_shapeId_idx"
        ON "GtfsRouteShape"("shapeId")
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`DROP TABLE IF EXISTS "GtfsRouteShape" CASCADE`.execute(db);
}
