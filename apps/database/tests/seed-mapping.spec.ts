import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "../index";
import {
    REQUIRED_SEED_PLATFORM_COLUMNS,
    REQUIRED_SEED_STOP_COLUMNS,
    mapSeedPlatform,
    mapSeedStop,
} from "../seed-mapping";

const STOP_FIXTURE = {
    id: "U100",
    name: "Dejvická",
    avgLatitude: 50.1,
    avgLongitude: 14.4,
};

const PLATFORM_FIXTURE = {
    id: "U100Z101P",
    name: "Dejvická",
    isMetro: true,
    latitude: 50.1,
    longitude: 14.4,
    stopId: "U100",
};

test("mapSeedStop produces every NOT-NULL column required by the Stop table", () => {
    const timestamp = new Date("2026-04-22T00:00:00Z");
    const row = mapSeedStop(STOP_FIXTURE, timestamp);

    assert.deepEqual(
        Object.keys(row).sort(),
        [...REQUIRED_SEED_STOP_COLUMNS].sort(),
        "seed Stop row must contain exactly the required insert columns. If a migration added a new NOT NULL column without a default, extend mapSeedStop and REQUIRED_SEED_STOP_COLUMNS together.",
    );
});

test("mapSeedStop backfills feed as PID (migration 0014 assumes U-prefixed PID stops)", () => {
    const row = mapSeedStop(STOP_FIXTURE, new Date());

    assert.equal(row.feed, GtfsFeedId.PID);
});

test("mapSeedStop preserves the provided timestamp for createdAt and updatedAt", () => {
    const timestamp = new Date("2026-04-22T12:34:56Z");
    const row = mapSeedStop(STOP_FIXTURE, timestamp);

    assert.equal(row.createdAt, timestamp);
    assert.equal(row.updatedAt, timestamp);
});

test("mapSeedStop forwards stop geometry and identity verbatim", () => {
    const row = mapSeedStop(STOP_FIXTURE, new Date());

    assert.equal(row.id, STOP_FIXTURE.id);
    assert.equal(row.name, STOP_FIXTURE.name);
    assert.equal(row.avgLatitude, STOP_FIXTURE.avgLatitude);
    assert.equal(row.avgLongitude, STOP_FIXTURE.avgLongitude);
});

test("mapSeedPlatform produces every NOT-NULL column required by the Platform table", () => {
    const timestamp = new Date("2026-04-22T00:00:00Z");
    const row = mapSeedPlatform(PLATFORM_FIXTURE, timestamp);

    assert.deepEqual(
        Object.keys(row).sort(),
        [...REQUIRED_SEED_PLATFORM_COLUMNS].sort(),
        "seed Platform row must contain exactly the required insert columns. If a migration added a new NOT NULL column without a default, extend mapSeedPlatform and REQUIRED_SEED_PLATFORM_COLUMNS together.",
    );
});

test("mapSeedPlatform coerces a missing stopId to null", () => {
    const row = mapSeedPlatform(
        { ...PLATFORM_FIXTURE, stopId: undefined as unknown as string },
        new Date(),
    );

    assert.equal(row.stopId, null);
});

test("mapSeedPlatform defaults code to null (seed JSON has no platform codes)", () => {
    const row = mapSeedPlatform(PLATFORM_FIXTURE, new Date());

    assert.equal(row.code, null);
});

test("mapSeedPlatform forwards platform geometry and metro flag verbatim", () => {
    const row = mapSeedPlatform(PLATFORM_FIXTURE, new Date());

    assert.equal(row.id, PLATFORM_FIXTURE.id);
    assert.equal(row.name, PLATFORM_FIXTURE.name);
    assert.equal(row.isMetro, PLATFORM_FIXTURE.isMetro);
    assert.equal(row.latitude, PLATFORM_FIXTURE.latitude);
    assert.equal(row.longitude, PLATFORM_FIXTURE.longitude);
    assert.equal(row.stopId, PLATFORM_FIXTURE.stopId);
});
