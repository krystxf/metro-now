import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import type { PidSnapshot } from "../../../services/imports/pid-import.service";
import {
    dedupeGtfsRoutes,
    mergeSnapshots,
} from "../../../services/sync/sync-merge.utils";
import type {
    GtfsSnapshot,
    SyncSnapshot,
    SyncedGtfsRoute,
} from "../../../types/sync.types";

const makeRoute = (id: string, feedId: GtfsFeedId): SyncedGtfsRoute => ({
    id,
    feedId,
    shortName: id,
    longName: null,
    type: "3",
    vehicleType: null,
    color: null,
    isNight: false,
    url: null,
});

const emptyGtfsSnapshot = (): GtfsSnapshot => ({
    gtfsRoutes: [],
    gtfsRouteStops: [],
    gtfsRouteShapes: [],
    gtfsStationEntrances: [],
    gtfsTrips: [],
    gtfsStopTimes: [],
    gtfsCalendars: [],
    gtfsCalendarDates: [],
    gtfsTransfers: [],
    gtfsFrequencies: [],
});

const emptySyncSnapshot = (): SyncSnapshot => ({
    stops: [],
    platforms: [],
    platformRoutes: [],
    ...emptyGtfsSnapshot(),
});

const emptyPidSnapshot = (): PidSnapshot => ({
    stops: [],
    platforms: [],
    platformRoutes: [],
    gtfsRoutes: [],
});

// ---------------------------------------------------------------------------
// dedupeGtfsRoutes
// ---------------------------------------------------------------------------

test("dedupeGtfsRoutes returns empty array for empty input", () => {
    assert.deepEqual(dedupeGtfsRoutes([]), []);
});

test("dedupeGtfsRoutes passes through unique routes unchanged", () => {
    const routes = [
        makeRoute("R1", GtfsFeedId.PID),
        makeRoute("R2", GtfsFeedId.PID),
        makeRoute("R1", GtfsFeedId.BRNO),
    ];
    const result = dedupeGtfsRoutes(routes);
    assert.equal(result.length, 3);
});

test("dedupeGtfsRoutes removes duplicate feedId+id combinations", () => {
    const v1 = { ...makeRoute("R1", GtfsFeedId.PID), shortName: "first" };
    const v2 = { ...makeRoute("R1", GtfsFeedId.PID), shortName: "second" };
    const result = dedupeGtfsRoutes([v1, v2]);
    assert.equal(result.length, 1);
    assert.equal(result[0]?.shortName, "second");
});

test("dedupeGtfsRoutes keeps routes with same id but different feedId", () => {
    const result = dedupeGtfsRoutes([
        makeRoute("R1", GtfsFeedId.PID),
        makeRoute("R1", GtfsFeedId.BRNO),
    ]);
    assert.equal(result.length, 2);
});

test("dedupeGtfsRoutes preserves insertion order for unique routes", () => {
    const routes = [
        makeRoute("R1", GtfsFeedId.PID),
        makeRoute("R2", GtfsFeedId.PID),
        makeRoute("R3", GtfsFeedId.PID),
    ];
    const result = dedupeGtfsRoutes(routes);
    assert.deepEqual(
        result.map((r) => r.id),
        ["R1", "R2", "R3"],
    );
});

// ---------------------------------------------------------------------------
// mergeSnapshots
// ---------------------------------------------------------------------------

test("mergeSnapshots with no city snapshots combines stopSnapshot and gtfsSnapshot", () => {
    const stopSnapshot: PidSnapshot = {
        stops: [
            {
                id: "U1",
                feed: GtfsFeedId.PID,
                name: "Stop 1",
                avgLatitude: 50,
                avgLongitude: 14,
            },
        ],
        platforms: [
            {
                id: "P1",
                name: "Plat 1",
                code: "1",
                isMetro: false,
                latitude: 50,
                longitude: 14,
                stopId: "U1",
            },
        ],
        platformRoutes: [
            { platformId: "P1", feedId: GtfsFeedId.PID, routeId: "L1" },
        ],
        gtfsRoutes: [makeRoute("L1", GtfsFeedId.PID)],
    };

    const gtfsSnapshot: GtfsSnapshot = {
        ...emptyGtfsSnapshot(),
        gtfsRoutes: [makeRoute("L2", GtfsFeedId.PID)],
        gtfsTrips: [
            {
                id: "PID::T1",
                feedId: GtfsFeedId.PID,
                tripId: "T1",
                routeId: "L1",
                serviceId: "S1",
                directionId: "0",
                shapeId: null,
                tripHeadsign: null,
                blockId: null,
                wheelchairAccessible: null,
                bikesAllowed: null,
            },
        ],
    };

    const result = mergeSnapshots(
        stopSnapshot,
        gtfsSnapshot,
        [],
        stopSnapshot.platforms,
    );

    assert.equal(result.stops.length, 1);
    assert.equal(result.platforms.length, 1);
    assert.equal(result.platformRoutes.length, 1);
    assert.equal(result.gtfsRoutes.length, 2);
    assert.equal(result.gtfsTrips.length, 1);
});

test("mergeSnapshots uses allPlatforms parameter for platforms field", () => {
    const platformFromCity = {
        id: "P2",
        name: "City Plat",
        code: "2",
        isMetro: false,
        latitude: 48,
        longitude: 16,
        stopId: null,
    };
    const allPlatforms = [platformFromCity];

    const result = mergeSnapshots(
        emptyPidSnapshot(),
        emptyGtfsSnapshot(),
        [],
        allPlatforms,
    );

    assert.deepEqual(result.platforms, allPlatforms);
});

test("mergeSnapshots accumulates stops from city snapshots", () => {
    const cityA: SyncSnapshot = {
        ...emptySyncSnapshot(),
        stops: [
            {
                id: "CityA:U1",
                feed: GtfsFeedId.BRNO,
                name: "Brno Stop",
                avgLatitude: 49,
                avgLongitude: 16.6,
            },
        ],
    };
    const cityB: SyncSnapshot = {
        ...emptySyncSnapshot(),
        stops: [
            {
                id: "CityB:U1",
                feed: GtfsFeedId.BRATISLAVA,
                name: "BA Stop",
                avgLatitude: 48,
                avgLongitude: 17,
            },
        ],
    };

    const result = mergeSnapshots(
        emptyPidSnapshot(),
        emptyGtfsSnapshot(),
        [cityA, cityB],
        [],
    );

    assert.equal(result.stops.length, 2);
    assert.equal(result.stops[0]?.id, "CityA:U1");
    assert.equal(result.stops[1]?.id, "CityB:U1");
});

test("mergeSnapshots deduplicates gtfsRoutes across all sources", () => {
    const pidSnapshot: PidSnapshot = {
        ...emptyPidSnapshot(),
        gtfsRoutes: [makeRoute("R1", GtfsFeedId.PID)],
    };
    const gtfsSnapshot: GtfsSnapshot = {
        ...emptyGtfsSnapshot(),
        gtfsRoutes: [makeRoute("R1", GtfsFeedId.PID)],
    };

    const result = mergeSnapshots(pidSnapshot, gtfsSnapshot, [], []);

    assert.equal(result.gtfsRoutes.length, 1);
});

test("mergeSnapshots accumulates all GTFS arrays from city snapshots", () => {
    const citySnapshot: SyncSnapshot = {
        ...emptySyncSnapshot(),
        gtfsRoutes: [makeRoute("CR1", GtfsFeedId.BRNO)],
        platformRoutes: [
            { platformId: "CP1", feedId: GtfsFeedId.BRNO, routeId: "CR1" },
        ],
    };

    const result = mergeSnapshots(
        emptyPidSnapshot(),
        emptyGtfsSnapshot(),
        [citySnapshot],
        [],
    );

    assert.equal(result.gtfsRoutes.length, 1);
    assert.equal(result.platformRoutes.length, 1);
});

test("mergeSnapshots with multiple city snapshots concatenates all arrays", () => {
    const city1: SyncSnapshot = {
        ...emptySyncSnapshot(),
        gtfsTrips: [
            {
                id: "BRNO::T1",
                feedId: GtfsFeedId.BRNO,
                tripId: "T1",
                routeId: "R1",
                serviceId: null,
                directionId: null,
                shapeId: null,
                tripHeadsign: null,
                blockId: null,
                wheelchairAccessible: null,
                bikesAllowed: null,
            },
        ],
    };
    const city2: SyncSnapshot = {
        ...emptySyncSnapshot(),
        gtfsTrips: [
            {
                id: "BA::T1",
                feedId: GtfsFeedId.BRATISLAVA,
                tripId: "T1",
                routeId: "R1",
                serviceId: null,
                directionId: null,
                shapeId: null,
                tripHeadsign: null,
                blockId: null,
                wheelchairAccessible: null,
                bikesAllowed: null,
            },
        ],
    };

    const result = mergeSnapshots(
        emptyPidSnapshot(),
        emptyGtfsSnapshot(),
        [city1, city2],
        [],
    );

    assert.equal(result.gtfsTrips.length, 2);
    assert.equal(result.gtfsTrips[0]?.feedId, GtfsFeedId.BRNO);
    assert.equal(result.gtfsTrips[1]?.feedId, GtfsFeedId.BRATISLAVA);
});
