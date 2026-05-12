import { GtfsFeedId, type NewPlatform, type NewStop } from "./index";

export type SeedStop = {
    id: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
};

export type SeedPlatform = {
    id: string;
    name: string;
    isMetro: boolean;
    latitude: number;
    longitude: number;
    stopId: string;
};

// Required insert columns that must appear in every seeded row. Kept in sync
// with StopTable/PlatformTable: includes every column without a server-side
// default (kysely `Generated<>`). When a migration adds a new NOT NULL column
// without a default, extend this list and the mapper below — the completeness
// spec will otherwise fail.
export const REQUIRED_SEED_STOP_COLUMNS = [
    "id",
    "feed",
    "name",
    "avgLatitude",
    "avgLongitude",
    "createdAt",
    "updatedAt",
] as const satisfies ReadonlyArray<keyof NewStop>;

export const REQUIRED_SEED_PLATFORM_COLUMNS = [
    "id",
    "name",
    "code",
    "isMetro",
    "latitude",
    "longitude",
    "stopId",
    "createdAt",
    "updatedAt",
] as const satisfies ReadonlyArray<keyof NewPlatform>;

export const mapSeedStop = (stop: SeedStop, timestamp: Date): NewStop => ({
    id: stop.id,
    name: stop.name,
    avgLatitude: stop.avgLatitude,
    avgLongitude: stop.avgLongitude,
    feed: GtfsFeedId.PID,
    createdAt: timestamp,
    updatedAt: timestamp,
});

export const mapSeedPlatform = (
    platform: SeedPlatform,
    timestamp: Date,
): NewPlatform => ({
    id: platform.id,
    name: platform.name,
    isMetro: platform.isMetro,
    latitude: platform.latitude,
    longitude: platform.longitude,
    stopId: platform.stopId ?? null,
    code: null,
    createdAt: timestamp,
    updatedAt: timestamp,
});
