import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    // Extensions
    await sql`CREATE EXTENSION IF NOT EXISTS cube`.execute(db);
    await sql`CREATE EXTENSION IF NOT EXISTS earthdistance`.execute(db);

    // Enums
    await sql`
        DO $$ BEGIN
            CREATE TYPE "VehicleType" AS ENUM ('METRO', 'BUS', 'TRAM', 'TRAIN', 'FERRY', 'FUNICULAR');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$
    `.execute(db);

    await sql`
        DO $$ BEGIN
            CREATE TYPE "LogLevel" AS ENUM ('info', 'warn', 'error');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$
    `.execute(db);

    // Stop
    await sql`
        CREATE TABLE IF NOT EXISTS "Stop" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "avgLatitude" DOUBLE PRECISION NOT NULL,
            "avgLongitude" DOUBLE PRECISION NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
        )
    `.execute(db);

    // Platform
    await sql`
        CREATE TABLE IF NOT EXISTS "Platform" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "code" TEXT,
            "isMetro" BOOLEAN NOT NULL,
            "latitude" DOUBLE PRECISION NOT NULL,
            "longitude" DOUBLE PRECISION NOT NULL,
            "stopId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Platform_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "Platform_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Stop"("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
    `.execute(db);

    // Route
    await sql`
        CREATE TABLE IF NOT EXISTS "Route" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "vehicleType" "VehicleType",
            "isNight" BOOLEAN,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
        )
    `.execute(db);

    // PlatformsOnRoutes
    await sql`
        CREATE TABLE IF NOT EXISTS "PlatformsOnRoutes" (
            "id" TEXT NOT NULL,
            "platformId" TEXT NOT NULL,
            "routeId" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "PlatformsOnRoutes_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "PlatformsOnRoutes_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "PlatformsOnRoutes_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        )
    `.execute(db);

    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "PlatformsOnRoutes_platformId_routeId_key"
        ON "PlatformsOnRoutes"("platformId", "routeId")
    `.execute(db);

    // GtfsRoute
    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsRoute" (
            "id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "shortName" TEXT NOT NULL,
            "longName" TEXT,
            "url" TEXT,
            "color" TEXT,
            "isNight" BOOLEAN,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "GtfsRoute_pkey" PRIMARY KEY ("id")
        )
    `.execute(db);

    // GtfsRouteStop
    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsRouteStop" (
            "id" TEXT NOT NULL,
            "routeId" TEXT NOT NULL,
            "directionId" TEXT NOT NULL,
            "stopId" TEXT NOT NULL,
            "stopSequence" INTEGER NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "GtfsRouteStop_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "GtfsRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "GtfsRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "GtfsRouteStop_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        )
    `.execute(db);

    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "GtfsRouteStop_routeId_directionId_stopId_stopSequence_key"
        ON "GtfsRouteStop"("routeId", "directionId", "stopId", "stopSequence")
    `.execute(db);

    // Log
    await sql`
        CREATE TABLE IF NOT EXISTS "Log" (
            "id" TEXT NOT NULL,
            "service" TEXT NOT NULL,
            "level" "LogLevel" NOT NULL,
            "message" TEXT NOT NULL,
            "context" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
        )
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "Log_service_createdAt_idx"
        ON "Log"("service", "createdAt")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "Log_level_createdAt_idx"
        ON "Log"("level", "createdAt")
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`DROP TABLE IF EXISTS "Log" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "GtfsRouteStop" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "GtfsRoute" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "PlatformsOnRoutes" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "Route" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "Platform" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "Stop" CASCADE`.execute(db);
    await sql`DROP TYPE IF EXISTS "LogLevel"`.execute(db);
    await sql`DROP TYPE IF EXISTS "VehicleType"`.execute(db);
    await sql`DROP EXTENSION IF EXISTS earthdistance`.execute(db);
    await sql`DROP EXTENSION IF EXISTS cube`.execute(db);
}
