import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import {
    buildGtfsRouteShapes,
    buildGtfsRouteStops,
    buildLogicalStops,
    distanceInMeters,
    getDominantPattern,
    matchStopsToPid,
    normalizeStopName,
    parseRoute,
    parseRouteWithAgency,
    parseStop,
    parseStopTime,
    parseTrip,
    toOptionalString,
} from "../../../services/imports/gtfs-complex-import.utils";
import type {
    DominantPattern,
    LogicalPlatform,
    ParsedStop,
} from "../../../services/imports/gtfs-complex-import.utils";

// ---------------------------------------------------------------------------
// toOptionalString
// ---------------------------------------------------------------------------

test("toOptionalString returns null for undefined", () => {
    assert.equal(toOptionalString(undefined), null);
});

test("toOptionalString returns null for empty string", () => {
    assert.equal(toOptionalString(""), null);
});

test("toOptionalString returns null for whitespace-only string", () => {
    assert.equal(toOptionalString("   "), null);
});

test("toOptionalString trims and returns non-empty string", () => {
    assert.equal(toOptionalString("  hello  "), "hello");
});

test("toOptionalString returns string unchanged when no trimming needed", () => {
    assert.equal(toOptionalString("value"), "value");
});

// ---------------------------------------------------------------------------
// normalizeStopName
// ---------------------------------------------------------------------------

test("normalizeStopName converts to lowercase", () => {
    assert.equal(normalizeStopName("HELLO"), "hello");
});

test("normalizeStopName strips diacritics", () => {
    assert.equal(normalizeStopName("Náměstí Míru"), "namesti miru");
});

test("normalizeStopName collapses multiple spaces", () => {
    assert.equal(normalizeStopName("Foo   Bar"), "foo bar");
});

test("normalizeStopName removes punctuation", () => {
    assert.equal(normalizeStopName("Foo, Bar (baz)"), "foo bar baz");
});

test("normalizeStopName handles mixed diacritics and punctuation", () => {
    assert.equal(normalizeStopName("Václavské náměstí"), "vaclavske namesti");
});

// ---------------------------------------------------------------------------
// distanceInMeters
// ---------------------------------------------------------------------------

test("distanceInMeters returns 0 for same coordinates", () => {
    assert.equal(distanceInMeters(50.0, 14.0, 50.0, 14.0), 0);
});

test("distanceInMeters returns roughly correct distance between two points", () => {
    // Prague center to ~1km east: 50.0755, 14.4378 → 50.0755, 14.4513
    const meters = distanceInMeters(50.0755, 14.4378, 50.0755, 14.4513);
    assert.ok(meters > 900 && meters < 1100, `expected ~1km, got ${meters}`);
});

test("distanceInMeters is symmetric", () => {
    const ab = distanceInMeters(50.0, 14.0, 51.0, 15.0);
    const ba = distanceInMeters(51.0, 15.0, 50.0, 14.0);
    assert.equal(ab, ba);
});

// ---------------------------------------------------------------------------
// parseStop
// ---------------------------------------------------------------------------

test("parseStop parses a valid stop row with all fields", () => {
    const stop = parseStop(
        {
            stop_id: "S1",
            stop_name: "Main Station",
            stop_lat: "50.0755",
            stop_lon: "14.4378",
            location_type: "1",
            parent_station: "PARENT1",
            platform_code: "A",
        },
        "TEST",
    );

    assert.equal(stop.id, "S1");
    assert.equal(stop.name, "Main Station");
    assert.equal(stop.latitude, 50.0755);
    assert.equal(stop.longitude, 14.4378);
    assert.equal(stop.locationType, "1");
    assert.equal(stop.parentStationId, "PARENT1");
    assert.equal(stop.platformCode, "A");
});

test("parseStop sets empty locationType to '0'", () => {
    const stop = parseStop(
        {
            stop_id: "S1",
            stop_name: "Stop",
            stop_lat: "50.0",
            stop_lon: "14.0",
        },
        "TEST",
    );

    assert.equal(stop.locationType, "0");
    assert.equal(stop.parentStationId, null);
    assert.equal(stop.platformCode, null);
});

test("parseStop throws on invalid coordinates", () => {
    assert.throws(
        () =>
            parseStop(
                {
                    stop_id: "S1",
                    stop_name: "Stop",
                    stop_lat: "not-a-number",
                    stop_lon: "14.0",
                },
                "TEST",
            ),
        /Invalid TEST GTFS stop coordinates/,
    );
});

test("parseStop trims stop name", () => {
    const stop = parseStop(
        {
            stop_id: "S1",
            stop_name: "  Trimmed  ",
            stop_lat: "50.0",
            stop_lon: "14.0",
        },
        "TEST",
    );

    assert.equal(stop.name, "Trimmed");
});

// ---------------------------------------------------------------------------
// parseRoute
// ---------------------------------------------------------------------------

test("parseRoute parses a route row with optional fields", () => {
    const route = parseRoute({
        route_id: "R1",
        route_short_name: "A",
        route_long_name: "Line A",
        route_type: "1",
        route_url: "https://example.com",
        route_color: "FF0000",
    });

    assert.equal(route.id, "R1");
    assert.equal(route.shortName, "A");
    assert.equal(route.longName, "Line A");
    assert.equal(route.type, "1");
    assert.equal(route.url, "https://example.com");
    assert.equal(route.color, "FF0000");
});

test("parseRoute sets optional fields to null when absent", () => {
    const route = parseRoute({
        route_id: "R1",
        route_short_name: "B",
        route_type: "2",
    });

    assert.equal(route.longName, null);
    assert.equal(route.url, null);
    assert.equal(route.color, null);
});

// ---------------------------------------------------------------------------
// parseRouteWithAgency
// ---------------------------------------------------------------------------

test("parseRouteWithAgency includes agencyId", () => {
    const route = parseRouteWithAgency({
        route_id: "R1",
        agency_id: "AG1",
        route_short_name: "X",
        route_type: "3",
    });

    assert.equal(route.id, "R1");
    assert.equal(route.agencyId, "AG1");
});

// ---------------------------------------------------------------------------
// parseTrip
// ---------------------------------------------------------------------------

test("parseTrip parses a trip row", () => {
    const trip = parseTrip({
        trip_id: "T1",
        route_id: "R1",
        direction_id: "1",
    });

    assert.equal(trip.id, "T1");
    assert.equal(trip.routeId, "R1");
    assert.equal(trip.directionId, "1");
});

test("parseTrip defaults directionId to '0' when absent", () => {
    const trip = parseTrip({ trip_id: "T1", route_id: "R1" });
    assert.equal(trip.directionId, "0");
});

// ---------------------------------------------------------------------------
// parseStopTime
// ---------------------------------------------------------------------------

test("parseStopTime parses a valid stop time row", () => {
    const stopTime = parseStopTime(
        { trip_id: "T1", stop_id: "S1", stop_sequence: "5" },
        "TEST",
    );

    assert.equal(stopTime.tripId, "T1");
    assert.equal(stopTime.stopId, "S1");
    assert.equal(stopTime.stopSequence, 5);
});

test("parseStopTime throws on non-integer stop_sequence", () => {
    assert.throws(
        () =>
            parseStopTime(
                { trip_id: "T1", stop_id: "S1", stop_sequence: "abc" },
                "TEST",
            ),
        /Invalid TEST GTFS stop sequence/,
    );
});

// ---------------------------------------------------------------------------
// buildLogicalStops — flat stops (no parent station)
// ---------------------------------------------------------------------------

test("buildLogicalStops returns empty array when no stops are referenced", () => {
    const stopsById = new Map<string, ParsedStop>([
        [
            "S1",
            {
                id: "S1",
                name: "Stop A",
                latitude: 50.0,
                longitude: 14.0,
                locationType: "0",
                parentStationId: null,
                platformCode: null,
            },
        ],
    ]);

    const result = buildLogicalStops({
        referencedStopIds: new Set(),
        stopsById,
        toStopId: (id) => id,
        toPlatformId: (id) => id,
    });

    assert.equal(result.length, 0);
});

test("buildLogicalStops creates a logical stop for each flat platform stop", () => {
    const stopsById = new Map<string, ParsedStop>([
        [
            "S1",
            {
                id: "S1",
                name: "Stop A",
                latitude: 50.1,
                longitude: 14.1,
                locationType: "0",
                parentStationId: null,
                platformCode: null,
            },
        ],
    ]);

    const result = buildLogicalStops({
        referencedStopIds: new Set(["S1"]),
        stopsById,
        toStopId: (id) => `STOP:${id}`,
        toPlatformId: (id) => `PLAT:${id}`,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, "STOP:S1");
    assert.equal(result[0]?.name, "Stop A");
    assert.equal(result[0]?.platforms.length, 1);
    assert.equal(result[0]?.platforms[0]?.id, "PLAT:S1");
});

test("buildLogicalStops groups child platforms under their parent station", () => {
    const stopsById = new Map<string, ParsedStop>([
        [
            "STATION",
            {
                id: "STATION",
                name: "Main Station",
                latitude: 50.0,
                longitude: 14.0,
                locationType: "1",
                parentStationId: null,
                platformCode: null,
            },
        ],
        [
            "PLAT_A",
            {
                id: "PLAT_A",
                name: "Platform A",
                latitude: 50.01,
                longitude: 14.01,
                locationType: "0",
                parentStationId: "STATION",
                platformCode: "A",
            },
        ],
        [
            "PLAT_B",
            {
                id: "PLAT_B",
                name: "Platform B",
                latitude: 50.02,
                longitude: 14.02,
                locationType: "0",
                parentStationId: "STATION",
                platformCode: "B",
            },
        ],
    ]);

    const result = buildLogicalStops({
        referencedStopIds: new Set(["PLAT_A", "PLAT_B"]),
        stopsById,
        toStopId: (id) => id,
        toPlatformId: (id) => id,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, "STATION");
    assert.equal(result[0]?.platforms.length, 2);

    const platformIds = result[0]?.platforms.map((p) => p.id).sort();
    assert.deepEqual(platformIds, ["PLAT_A", "PLAT_B"]);
});

test("buildLogicalStops computes average coordinates from platforms", () => {
    const stopsById = new Map<string, ParsedStop>([
        [
            "STATION",
            {
                id: "STATION",
                name: "Station",
                latitude: 50.0,
                longitude: 14.0,
                locationType: "1",
                parentStationId: null,
                platformCode: null,
            },
        ],
        [
            "P1",
            {
                id: "P1",
                name: "P1",
                latitude: 50.0,
                longitude: 14.0,
                locationType: "0",
                parentStationId: "STATION",
                platformCode: null,
            },
        ],
        [
            "P2",
            {
                id: "P2",
                name: "P2",
                latitude: 50.2,
                longitude: 14.2,
                locationType: "0",
                parentStationId: "STATION",
                platformCode: null,
            },
        ],
    ]);

    const result = buildLogicalStops({
        referencedStopIds: new Set(["P1", "P2"]),
        stopsById,
        toStopId: (id) => id,
        toPlatformId: (id) => id,
    });

    assert.equal(result.length, 1);
    assert.ok(Math.abs((result[0]?.avgLatitude ?? 0) - 50.1) < 0.0001);
    assert.ok(Math.abs((result[0]?.avgLongitude ?? 0) - 14.1) < 0.0001);
});

test("buildLogicalStops stores normalized name", () => {
    const stopsById = new Map<string, ParsedStop>([
        [
            "S1",
            {
                id: "S1",
                name: "Náměstí Míru",
                latitude: 50.0,
                longitude: 14.0,
                locationType: "0",
                parentStationId: null,
                platformCode: null,
            },
        ],
    ]);

    const result = buildLogicalStops({
        referencedStopIds: new Set(["S1"]),
        stopsById,
        toStopId: (id) => id,
        toPlatformId: (id) => id,
    });

    assert.equal(result[0]?.normalizedName, "namesti miru");
});

// ---------------------------------------------------------------------------
// getDominantPattern
// ---------------------------------------------------------------------------

test("getDominantPattern returns empty array when no patterns exist for route", () => {
    const patterns = new Map<string, Map<string, DominantPattern>>([
        [
            "OTHER::0",
            new Map([
                [
                    "seq",
                    { directionId: "0", platformIds: ["P1"], tripCount: 5 },
                ],
            ]),
        ],
    ]);

    const result = getDominantPattern({ id: "R1" }, patterns);
    assert.equal(result.length, 0);
});

test("getDominantPattern selects the pattern with the highest trip count", () => {
    const patterns = new Map<string, Map<string, DominantPattern>>([
        [
            "R1::0",
            new Map<string, DominantPattern>([
                [
                    "short",
                    {
                        directionId: "0",
                        platformIds: ["P1", "P3"],
                        tripCount: 2,
                    },
                ],
                [
                    "long",
                    {
                        directionId: "0",
                        platformIds: ["P1", "P2", "P3"],
                        tripCount: 10,
                    },
                ],
            ]),
        ],
    ]);

    const result = getDominantPattern({ id: "R1" }, patterns);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0]?.pattern.platformIds, ["P1", "P2", "P3"]);
    assert.equal(result[0]?.pattern.tripCount, 10);
});

test("getDominantPattern returns one entry per direction, sorted by directionId", () => {
    const patterns = new Map<string, Map<string, DominantPattern>>([
        [
            "R1::1",
            new Map([
                [
                    "seq",
                    {
                        directionId: "1",
                        platformIds: ["P2", "P1"],
                        tripCount: 8,
                    },
                ],
            ]),
        ],
        [
            "R1::0",
            new Map([
                [
                    "seq",
                    {
                        directionId: "0",
                        platformIds: ["P1", "P2"],
                        tripCount: 10,
                    },
                ],
            ]),
        ],
    ]);

    const result = getDominantPattern({ id: "R1" }, patterns);
    assert.equal(result.length, 2);
    assert.equal(result[0]?.pattern.directionId, "0");
    assert.equal(result[1]?.pattern.directionId, "1");
});

// ---------------------------------------------------------------------------
// matchStopsToPid
// ---------------------------------------------------------------------------

test("matchStopsToPid matches stops by name and proximity", () => {
    const pidStops = [
        {
            id: "PID:Florenc",
            feed: GtfsFeedId.PID,
            name: "Florenc",
            avgLatitude: 50.0905,
            avgLongitude: 14.4388,
        },
    ];

    const gtfsStops = [
        {
            id: "GTFS:Florenc",
            gtfsStopId: "GTFS:Florenc",
            name: "Florenc",
            normalizedName: "florenc",
            avgLatitude: 50.0905,
            avgLongitude: 14.4388,
            platforms: [],
            entrances: [],
        },
    ];

    const result = matchStopsToPid(pidStops, gtfsStops);
    assert.equal(result.get("GTFS:Florenc"), "PID:Florenc");
});

test("matchStopsToPid rejects stops that are more than 250m away", () => {
    const pidStops = [
        {
            id: "PID:Florenc",
            feed: GtfsFeedId.PID,
            name: "Florenc",
            avgLatitude: 50.0905,
            avgLongitude: 14.4388,
        },
    ];

    const gtfsStops = [
        {
            id: "GTFS:Florenc",
            gtfsStopId: "GTFS:Florenc",
            name: "Florenc",
            normalizedName: "florenc",
            avgLatitude: 51.0,
            avgLongitude: 14.4388,
            platforms: [],
            entrances: [],
        },
    ];

    const result = matchStopsToPid(pidStops, gtfsStops);
    assert.equal(result.size, 0);
});

test("matchStopsToPid requires name match", () => {
    const pidStops = [
        {
            id: "PID:Florenc",
            feed: GtfsFeedId.PID,
            name: "Florenc",
            avgLatitude: 50.0905,
            avgLongitude: 14.4388,
        },
    ];

    const gtfsStops = [
        {
            id: "GTFS:Nadrazi",
            gtfsStopId: "GTFS:Nadrazi",
            name: "Nádraží",
            normalizedName: "nadrazi",
            avgLatitude: 50.0905,
            avgLongitude: 14.4388,
            platforms: [],
            entrances: [],
        },
    ];

    const result = matchStopsToPid(pidStops, gtfsStops);
    assert.equal(result.size, 0);
});

test("matchStopsToPid picks the nearest candidate when multiple match by name", () => {
    const pidStops = [
        {
            id: "PID:Florenc",
            feed: GtfsFeedId.PID,
            name: "Florenc",
            avgLatitude: 50.0905,
            avgLongitude: 14.4388,
        },
    ];

    const gtfsStops = [
        {
            id: "NEAR",
            gtfsStopId: "NEAR",
            name: "Florenc",
            normalizedName: "florenc",
            avgLatitude: 50.0905,
            avgLongitude: 14.439,
            platforms: [],
            entrances: [],
        },
        {
            id: "FAR",
            gtfsStopId: "FAR",
            name: "Florenc",
            normalizedName: "florenc",
            avgLatitude: 50.0905,
            avgLongitude: 14.44,
            platforms: [],
            entrances: [],
        },
    ];

    const result = matchStopsToPid(pidStops, gtfsStops);
    assert.equal(result.get("NEAR"), "PID:Florenc");
    assert.equal(result.get("FAR"), undefined);
});

// ---------------------------------------------------------------------------
// buildGtfsRouteStops
// ---------------------------------------------------------------------------

test("buildGtfsRouteStops produces route stops from dominant patterns", () => {
    const platform: LogicalPlatform = {
        id: "P1",
        name: "Platform 1",
        code: null,
        latitude: 50.0,
        longitude: 14.0,
        stopId: "S1",
        routeIds: new Set(["R1"]),
    };

    const platformById = new Map<string, LogicalPlatform>([["P1", platform]]);

    const patterns = new Map<string, Map<string, DominantPattern>>([
        [
            "R1::0",
            new Map([
                [
                    "seq",
                    { directionId: "0", platformIds: ["P1"], tripCount: 5 },
                ],
            ]),
        ],
    ]);

    const result = buildGtfsRouteStops({
        routes: [{ id: "R1" }],
        patternsByRouteAndDirection: patterns,
        platformById,
        feedId: GtfsFeedId.PID,
        toRouteId: (id) => id,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.routeId, "R1");
    assert.equal(result[0]?.platformId, "P1");
    assert.equal(result[0]?.directionId, "0");
    assert.equal(result[0]?.stopSequence, 0);
});

test("buildGtfsRouteStops skips platforms not in platformById", () => {
    const patterns = new Map<string, Map<string, DominantPattern>>([
        [
            "R1::0",
            new Map([
                [
                    "seq",
                    {
                        directionId: "0",
                        platformIds: ["UNKNOWN"],
                        tripCount: 5,
                    },
                ],
            ]),
        ],
    ]);

    const result = buildGtfsRouteStops({
        routes: [{ id: "R1" }],
        patternsByRouteAndDirection: patterns,
        platformById: new Map(),
        feedId: GtfsFeedId.PID,
        toRouteId: (id) => id,
    });

    assert.equal(result.length, 0);
});

// ---------------------------------------------------------------------------
// buildGtfsRouteShapes
// ---------------------------------------------------------------------------

test("buildGtfsRouteShapes produces a LineString from platform coordinates", () => {
    const p1: LogicalPlatform = {
        id: "P1",
        name: "P1",
        code: null,
        latitude: 50.0,
        longitude: 14.0,
        stopId: "S1",
        routeIds: new Set(),
    };
    const p2: LogicalPlatform = {
        id: "P2",
        name: "P2",
        code: null,
        latitude: 50.1,
        longitude: 14.1,
        stopId: "S2",
        routeIds: new Set(),
    };

    const platformById = new Map([
        ["P1", p1],
        ["P2", p2],
    ]);
    const patterns = new Map<string, Map<string, DominantPattern>>([
        [
            "R1::0",
            new Map([
                [
                    "seq",
                    {
                        directionId: "0",
                        platformIds: ["P1", "P2"],
                        tripCount: 3,
                    },
                ],
            ]),
        ],
    ]);

    const result = buildGtfsRouteShapes({
        routes: [{ id: "R1" }],
        patternsByRouteAndDirection: patterns,
        platformById,
        feedId: GtfsFeedId.PID,
        toRouteId: (id) => id,
    });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.geoJson.type, "LineString");
    assert.equal(result[0]?.geoJson.coordinates.length, 2);
    assert.deepEqual(result[0]?.geoJson.coordinates[0], [14.0, 50.0]);
    assert.deepEqual(result[0]?.geoJson.coordinates[1], [14.1, 50.1]);
});

test("buildGtfsRouteShapes skips shapes with fewer than 2 unique points", () => {
    const p1: LogicalPlatform = {
        id: "P1",
        name: "P1",
        code: null,
        latitude: 50.0,
        longitude: 14.0,
        stopId: "S1",
        routeIds: new Set(),
    };

    const platformById = new Map([["P1", p1]]);
    const patterns = new Map<string, Map<string, DominantPattern>>([
        [
            "R1::0",
            new Map([
                [
                    "seq",
                    { directionId: "0", platformIds: ["P1"], tripCount: 3 },
                ],
            ]),
        ],
    ]);

    const result = buildGtfsRouteShapes({
        routes: [{ id: "R1" }],
        patternsByRouteAndDirection: patterns,
        platformById,
        feedId: GtfsFeedId.PID,
        toRouteId: (id) => id,
    });

    assert.equal(result.length, 0);
});
