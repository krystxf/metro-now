import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsTrip" (
            "id" TEXT NOT NULL,
            "feedId" TEXT NOT NULL,
            "tripId" TEXT NOT NULL,
            "routeId" TEXT NOT NULL,
            "serviceId" TEXT,
            "directionId" TEXT,
            "shapeId" TEXT,
            "tripHeadsign" TEXT,
            "blockId" TEXT,
            "wheelchairAccessible" TEXT,
            "bikesAllowed" TEXT,
            "rawData" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "GtfsTrip_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "GtfsTrip_feedId_tripId_key" UNIQUE ("feedId", "tripId")
        )
    `.execute(db);

    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsStopTime" (
            "id" TEXT NOT NULL,
            "feedId" TEXT NOT NULL,
            "tripId" TEXT NOT NULL,
            "stopId" TEXT NOT NULL,
            "platformId" TEXT,
            "stopSequence" INTEGER NOT NULL,
            "arrivalTime" TEXT,
            "departureTime" TEXT,
            "pickupType" TEXT,
            "dropOffType" TEXT,
            "timepoint" TEXT,
            "rawData" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "GtfsStopTime_pkey" PRIMARY KEY ("id")
        )
    `.execute(db);

    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "feedId" TEXT
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "tripId" TEXT
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "stopId" TEXT
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "stopSequence" INTEGER
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "arrivalTime" TEXT
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "departureTime" TEXT
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "pickupType" TEXT
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "dropOffType" TEXT
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "timepoint" TEXT
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "rawData" JSONB
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    `.execute(db);
    await sql`
        ALTER TABLE "GtfsStopTime"
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    `.execute(db);

    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsCalendar" (
            "id" TEXT NOT NULL,
            "feedId" TEXT NOT NULL,
            "serviceId" TEXT NOT NULL,
            "monday" BOOLEAN NOT NULL,
            "tuesday" BOOLEAN NOT NULL,
            "wednesday" BOOLEAN NOT NULL,
            "thursday" BOOLEAN NOT NULL,
            "friday" BOOLEAN NOT NULL,
            "saturday" BOOLEAN NOT NULL,
            "sunday" BOOLEAN NOT NULL,
            "startDate" TEXT,
            "endDate" TEXT,
            "rawData" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "GtfsCalendar_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "GtfsCalendar_feedId_serviceId_key" UNIQUE ("feedId", "serviceId")
        )
    `.execute(db);

    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsCalendarDate" (
            "id" TEXT NOT NULL,
            "feedId" TEXT NOT NULL,
            "serviceId" TEXT NOT NULL,
            "date" TEXT NOT NULL,
            "exceptionType" INTEGER NOT NULL,
            "rawData" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "GtfsCalendarDate_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "GtfsCalendarDate_feed_service_date_exception_key" UNIQUE ("feedId", "serviceId", "date", "exceptionType")
        )
    `.execute(db);

    await sql`
        CREATE TABLE IF NOT EXISTS "GtfsTransfer" (
            "id" TEXT NOT NULL,
            "feedId" TEXT NOT NULL,
            "fromStopId" TEXT,
            "toStopId" TEXT,
            "fromRouteId" TEXT,
            "toRouteId" TEXT,
            "fromTripId" TEXT,
            "toTripId" TEXT,
            "transferType" INTEGER,
            "minTransferTime" INTEGER,
            "rawData" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "GtfsTransfer_pkey" PRIMARY KEY ("id")
        )
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsTrip_feedId_routeId_idx"
        ON "GtfsTrip"("feedId", "routeId")
    `.execute(db);
    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsTrip_feedId_serviceId_idx"
        ON "GtfsTrip"("feedId", "serviceId")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsStopTime_feedId_tripId_stopSequence_idx"
        ON "GtfsStopTime"("feedId", "tripId", "stopSequence")
    `.execute(db);
    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsStopTime_platformId_idx"
        ON "GtfsStopTime"("platformId")
    `.execute(db);
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "GtfsStopTime_feed_trip_stop_sequence_stop_key"
        ON "GtfsStopTime"("feedId", "tripId", "stopSequence", "stopId")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsCalendar_feedId_serviceId_idx"
        ON "GtfsCalendar"("feedId", "serviceId")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsCalendarDate_feedId_serviceId_date_idx"
        ON "GtfsCalendarDate"("feedId", "serviceId", "date")
    `.execute(db);

    await sql`
        CREATE INDEX IF NOT EXISTS "GtfsTransfer_feedId_fromStopId_toStopId_idx"
        ON "GtfsTransfer"("feedId", "fromStopId", "toStopId")
    `.execute(db);
}

export async function down(
    db: // biome-ignore lint/suspicious/noExplicitAny: Kysely migration signature
    Kysely<any>,
): Promise<void> {
    await sql`DROP TABLE IF EXISTS "GtfsTransfer" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "GtfsCalendarDate" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "GtfsCalendar" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "GtfsStopTime" CASCADE`.execute(db);
    await sql`DROP TABLE IF EXISTS "GtfsTrip" CASCADE`.execute(db);
}
