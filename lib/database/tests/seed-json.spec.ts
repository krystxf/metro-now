import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import test from "node:test";

// Bounds that comfortably contain every stop in the Czech/Slovak PID seed set
// and still catch swapped lat/lon or garbage coordinates. Expand carefully if
// the seed expands to new regions.
const CZECH_LAT_RANGE = { min: 48.5, max: 51.1 } as const;
const CZECH_LON_RANGE = { min: 12.0, max: 18.9 } as const;

const SEEDS_ROOT = path.join(__dirname, "..", "..", "seeds");

const readSeed = <T>(name: string): T => {
    const raw = readFileSync(path.join(SEEDS_ROOT, name), "utf8");

    return JSON.parse(raw) as T;
};

type SeedStop = {
    id: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
};

type SeedPlatform = {
    id: string;
    name: string;
    isMetro: boolean;
    latitude: number;
    longitude: number;
    stopId?: string;
};

test("seeds/stops.json parses as a non-empty array of stop rows", () => {
    const stops = readSeed<SeedStop[]>("stops.json");

    assert.ok(Array.isArray(stops), "stops.json must be a top-level array");
    assert.ok(stops.length > 0, "stops.json must contain at least one stop");
});

test("every seed stop has all required fields with sane types", () => {
    const stops = readSeed<SeedStop[]>("stops.json");

    for (const stop of stops) {
        assert.equal(
            typeof stop.id,
            "string",
            `stop id must be a string, got ${JSON.stringify(stop)}`,
        );
        assert.ok(stop.id.length > 0, `stop id must be non-empty: ${stop.id}`);
        assert.equal(
            typeof stop.name,
            "string",
            `stop ${stop.id} name must be a string`,
        );
        assert.ok(
            stop.name.length > 0,
            `stop ${stop.id} name must be non-empty`,
        );
        assert.equal(
            typeof stop.avgLatitude,
            "number",
            `stop ${stop.id} avgLatitude must be a number`,
        );
        assert.equal(
            typeof stop.avgLongitude,
            "number",
            `stop ${stop.id} avgLongitude must be a number`,
        );
    }
});

test("every seed stop coordinate falls inside the Czech/Slovak bounding box", () => {
    const stops = readSeed<SeedStop[]>("stops.json");
    const outOfBounds = stops.filter(
        (stop) =>
            stop.avgLatitude < CZECH_LAT_RANGE.min ||
            stop.avgLatitude > CZECH_LAT_RANGE.max ||
            stop.avgLongitude < CZECH_LON_RANGE.min ||
            stop.avgLongitude > CZECH_LON_RANGE.max,
    );

    assert.deepEqual(
        outOfBounds.map(({ id, avgLatitude, avgLongitude }) => ({
            id,
            avgLatitude,
            avgLongitude,
        })),
        [],
        "stops.json contains coordinates outside the expected bounds — either lat/lon are swapped or the bounds need widening",
    );
});

test("seed stop IDs are unique", () => {
    const stops = readSeed<SeedStop[]>("stops.json");
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const stop of stops) {
        if (seen.has(stop.id)) {
            duplicates.push(stop.id);
        }
        seen.add(stop.id);
    }

    assert.deepEqual(duplicates, [], "stops.json contains duplicate IDs");
});

test("seeds/platforms.json parses as a non-empty array of platform rows", () => {
    const platforms = readSeed<SeedPlatform[]>("platforms.json");

    assert.ok(Array.isArray(platforms));
    assert.ok(
        platforms.length > 0,
        "platforms.json must contain at least one platform",
    );
});

test("every seed platform has all required fields with sane types", () => {
    const platforms = readSeed<SeedPlatform[]>("platforms.json");

    for (const platform of platforms) {
        assert.equal(typeof platform.id, "string");
        assert.ok(platform.id.length > 0, "platform id must be non-empty");
        assert.equal(typeof platform.name, "string");
        assert.ok(
            platform.name.length > 0,
            `platform ${platform.id} name must be non-empty`,
        );
        assert.equal(
            typeof platform.isMetro,
            "boolean",
            `platform ${platform.id} isMetro must be boolean`,
        );
        assert.equal(typeof platform.latitude, "number");
        assert.equal(typeof platform.longitude, "number");
    }
});

test("every seed platform coordinate falls inside the Czech/Slovak bounding box", () => {
    const platforms = readSeed<SeedPlatform[]>("platforms.json");
    const outOfBounds = platforms.filter(
        (platform) =>
            platform.latitude < CZECH_LAT_RANGE.min ||
            platform.latitude > CZECH_LAT_RANGE.max ||
            platform.longitude < CZECH_LON_RANGE.min ||
            platform.longitude > CZECH_LON_RANGE.max,
    );

    assert.deepEqual(
        outOfBounds.map(({ id, latitude, longitude }) => ({
            id,
            latitude,
            longitude,
        })),
        [],
        "platforms.json contains coordinates outside the expected bounds",
    );
});

test("seed platform IDs are unique", () => {
    const platforms = readSeed<SeedPlatform[]>("platforms.json");
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const platform of platforms) {
        if (seen.has(platform.id)) {
            duplicates.push(platform.id);
        }
        seen.add(platform.id);
    }

    assert.deepEqual(duplicates, [], "platforms.json contains duplicate IDs");
});

test("every seed platform.stopId refers to an existing seed stop", () => {
    const stops = readSeed<SeedStop[]>("stops.json");
    const platforms = readSeed<SeedPlatform[]>("platforms.json");
    const stopIds = new Set(stops.map((stop) => stop.id));
    const dangling = platforms
        .filter(
            (platform) =>
                platform.stopId !== undefined && platform.stopId !== null,
        )
        .filter((platform) => !stopIds.has(platform.stopId as string))
        .map(({ id, stopId }) => ({ id, stopId }));

    assert.deepEqual(
        dangling,
        [],
        "platforms.json references stopId values with no matching row in stops.json (FK would break on seed)",
    );
});
