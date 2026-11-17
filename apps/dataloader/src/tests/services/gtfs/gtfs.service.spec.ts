import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import {
    normalizeGtfsStopId,
    parseGtfsRouteRecord,
    parseGtfsRouteStopRecord,
    parseGtfsShapePointRecord,
    parseGtfsStopRecord,
    parseGtfsTripRecord,
    parseNightFlag,
    toDirectionId,
    toOptionalString,
} from "../../../services/gtfs/gtfs-record-parsers.utils";
import {
    buildGtfsShapeDatasets,
    buildGtfsStationEntranceDataset,
} from "../../../services/gtfs/gtfs-shape-datasets.utils";

test("buildGtfsShapeDatasets derives route geometries and primary shapes", () => {
    const datasets = buildGtfsShapeDatasets({
        feedId: GtfsFeedId.PID,
        trips: [
            { routeId: "L1", directionId: "0", shapeId: "shape-a" },
            { routeId: "L1", directionId: "0", shapeId: "shape-a" },
            { routeId: "L1", directionId: "0", shapeId: "shape-b" },
            { routeId: "L1", directionId: "1", shapeId: "shape-c" },
            { routeId: "L2", directionId: "0", shapeId: "shape-a" },
            { routeId: "ignored-route", directionId: "0", shapeId: "shape-c" },
        ],
        shapePoints: [
            {
                shapeId: "shape-a",
                latitude: 50.1,
                longitude: 14.4,
                sequence: 2,
            },
            {
                shapeId: "shape-a",
                latitude: 50.05,
                longitude: 14.35,
                sequence: 1,
            },
            {
                shapeId: "shape-b",
                latitude: 50.2,
                longitude: 14.5,
                sequence: 1,
            },
            {
                shapeId: "shape-b",
                latitude: 50.25,
                longitude: 14.55,
                sequence: 2,
            },
            {
                shapeId: "shape-c",
                latitude: 50.3,
                longitude: 14.6,
                sequence: 1,
            },
            {
                shapeId: "shape-c",
                latitude: 50.35,
                longitude: 14.65,
                sequence: 2,
            },
        ],
        routeIdsWithImportedPlatforms: new Set(["L1", "L2"]),
    });

    assert.deepEqual(datasets.gtfsRouteShapes, [
        {
            feedId: GtfsFeedId.PID,
            routeId: "L1",
            directionId: "0",
            shapeId: "shape-a",
            tripCount: 2,
            isPrimary: true,
            geoJson: {
                type: "LineString",
                coordinates: [
                    [14.35, 50.05],
                    [14.4, 50.1],
                ],
            },
        },
        {
            feedId: GtfsFeedId.PID,
            routeId: "L1",
            directionId: "0",
            shapeId: "shape-b",
            tripCount: 1,
            isPrimary: false,
            geoJson: {
                type: "LineString",
                coordinates: [
                    [14.5, 50.2],
                    [14.55, 50.25],
                ],
            },
        },
        {
            feedId: GtfsFeedId.PID,
            routeId: "L1",
            directionId: "1",
            shapeId: "shape-c",
            tripCount: 1,
            isPrimary: true,
            geoJson: {
                type: "LineString",
                coordinates: [
                    [14.6, 50.3],
                    [14.65, 50.35],
                ],
            },
        },
        {
            feedId: GtfsFeedId.PID,
            routeId: "L2",
            directionId: "0",
            shapeId: "shape-a",
            tripCount: 1,
            isPrimary: true,
            geoJson: {
                type: "LineString",
                coordinates: [
                    [14.35, 50.05],
                    [14.4, 50.1],
                ],
            },
        },
    ]);
});

test("buildGtfsShapeDatasets rejects trip shapes missing from shapes.txt", () => {
    assert.throws(
        () =>
            buildGtfsShapeDatasets({
                feedId: GtfsFeedId.PID,
                trips: [
                    {
                        routeId: "L1",
                        directionId: "0",
                        shapeId: "missing-shape",
                    },
                ],
                shapePoints: [],
                routeIdsWithImportedPlatforms: new Set(["L1"]),
            }),
        /missing shape 'missing-shape'/,
    );
});

test("buildGtfsStationEntranceDataset derives metro station entrances from GTFS stops", () => {
    const datasets = buildGtfsStationEntranceDataset({
        feedId: GtfsFeedId.PID,
        stops: [
            {
                id: "U1072S1",
                name: "Mustek",
                latitude: 50.08353,
                longitude: 14.42456,
                locationType: "1",
                parentStationId: null,
            },
            {
                id: "U1072E1",
                name: "Mustek entrance A",
                latitude: 50.08312,
                longitude: 14.42496,
                locationType: "2",
                parentStationId: "U1072S1",
            },
            {
                id: "U1072E2",
                name: "Mustek entrance B",
                latitude: 50.08394,
                longitude: 14.42415,
                locationType: "2",
                parentStationId: "U1072S1",
            },
            {
                id: "U9999E1",
                name: "Ignored non-metro entrance",
                latitude: 50.1,
                longitude: 14.5,
                locationType: "2",
                parentStationId: "U9999S1",
            },
        ],
        importedMetroStopIds: new Set(["U1072"]),
    });

    assert.deepEqual(datasets.gtfsStationEntrances, [
        {
            id: "U1072E1",
            feedId: GtfsFeedId.PID,
            stopId: "U1072",
            parentStationId: "U1072S1",
            name: "Mustek entrance A",
            latitude: 50.08312,
            longitude: 14.42496,
        },
        {
            id: "U1072E2",
            feedId: GtfsFeedId.PID,
            stopId: "U1072",
            parentStationId: "U1072S1",
            name: "Mustek entrance B",
            latitude: 50.08394,
            longitude: 14.42415,
        },
    ]);
});

// === toOptionalString ===

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

// === normalizeGtfsStopId ===

test("normalizeGtfsStopId strips underscore suffix", () => {
    assert.equal(normalizeGtfsStopId("U12345_67"), "U12345");
});

test("normalizeGtfsStopId returns unchanged id without underscore", () => {
    assert.equal(normalizeGtfsStopId("U12345"), "U12345");
});

// === toDirectionId ===

test("toDirectionId returns value when present", () => {
    assert.equal(toDirectionId("1"), "1");
});

test("toDirectionId returns 'unknown' for undefined", () => {
    assert.equal(toDirectionId(undefined), "unknown");
});

test("toDirectionId returns 'unknown' for empty string", () => {
    assert.equal(toDirectionId(""), "unknown");
});

// === parseNightFlag ===

test("parseNightFlag returns true for '1'", () => {
    assert.equal(parseNightFlag("1"), true);
});

test("parseNightFlag returns false for '0'", () => {
    assert.equal(parseNightFlag("0"), false);
});

test("parseNightFlag returns null for undefined", () => {
    assert.equal(parseNightFlag(undefined), null);
});

test("parseNightFlag returns null for empty string", () => {
    assert.equal(parseNightFlag(""), null);
});

test("parseNightFlag throws for unexpected value", () => {
    assert.throws(() => parseNightFlag("2"), /Unexpected GTFS is_night flag/);
});

// === parseGtfsStopRecord ===

test("parseGtfsStopRecord parses a normal stop", () => {
    const stop = parseGtfsStopRecord({
        stop_id: "U135N2",
        stop_name: "  Mustek  ",
        stop_lat: "50.106538",
        stop_lon: "14.537558",
        location_type: "0",
        parent_station: "U135S1",
    });

    assert.deepEqual(stop, {
        id: "U135N2",
        name: "Mustek",
        latitude: 50.106538,
        longitude: 14.537558,
        locationType: "0",
        parentStationId: "U135S1",
    });
});

test("parseGtfsStopRecord parses blank stop name for non-entrance locations", () => {
    const stop = parseGtfsStopRecord({
        stop_id: "U135N2",
        stop_name: "",
        stop_lat: "50.106538",
        stop_lon: "14.537558",
        location_type: "3",
        parent_station: "U135S1",
    });

    assert.deepEqual(stop, {
        id: "U135N2",
        name: "",
        latitude: 50.106538,
        longitude: 14.537558,
        locationType: "3",
        parentStationId: "U135S1",
    });
});

test("parseGtfsStopRecord defaults location_type to '0' when absent", () => {
    const stop = parseGtfsStopRecord({
        stop_id: "U135N2",
        stop_name: "Stop",
        stop_lat: "50.0",
        stop_lon: "14.0",
    });

    assert.equal(stop.locationType, "0");
    assert.equal(stop.parentStationId, null);
});

test("parseGtfsStopRecord normalizes stop_id by stripping underscore suffix", () => {
    const stop = parseGtfsStopRecord({
        stop_id: "U135N2_1",
        stop_name: "Stop",
        stop_lat: "50.0",
        stop_lon: "14.0",
    });

    assert.equal(stop.id, "U135N2");
});

test("parseGtfsStopRecord throws for invalid coordinates", () => {
    assert.throws(
        () =>
            parseGtfsStopRecord({
                stop_id: "U1",
                stop_name: "Stop",
                stop_lat: "not-a-number",
                stop_lon: "14.0",
            }),
        /Invalid GTFS stop coordinates/,
    );
});

// === parseGtfsTripRecord ===

test("parseGtfsTripRecord parses a full record", () => {
    const trip = parseGtfsTripRecord({
        route_id: "L10",
        direction_id: "1",
        shape_id: "shape-123",
    });

    assert.deepEqual(trip, {
        routeId: "L10",
        directionId: "1",
        shapeId: "shape-123",
    });
});

test("parseGtfsTripRecord defaults direction_id to 'unknown' when absent", () => {
    const trip = parseGtfsTripRecord({
        route_id: "L10",
    });

    assert.equal(trip.directionId, "unknown");
    assert.equal(trip.shapeId, null);
});

// === parseGtfsShapePointRecord ===

test("parseGtfsShapePointRecord parses a valid shape point", () => {
    const point = parseGtfsShapePointRecord({
        shape_id: "s1",
        shape_pt_lat: "50.1",
        shape_pt_lon: "14.4",
        shape_pt_sequence: "3",
    });

    assert.deepEqual(point, {
        shapeId: "s1",
        latitude: 50.1,
        longitude: 14.4,
        sequence: 3,
    });
});

test("parseGtfsShapePointRecord throws for non-integer sequence", () => {
    assert.throws(
        () =>
            parseGtfsShapePointRecord({
                shape_id: "s1",
                shape_pt_lat: "50.1",
                shape_pt_lon: "14.4",
                shape_pt_sequence: "1.5",
            }),
        /Invalid GTFS shape point sequence/,
    );
});

test("parseGtfsShapePointRecord throws for invalid coordinates", () => {
    assert.throws(
        () =>
            parseGtfsShapePointRecord({
                shape_id: "s1",
                shape_pt_lat: "bad",
                shape_pt_lon: "14.4",
                shape_pt_sequence: "1",
            }),
        /Invalid GTFS shape point coordinates/,
    );
});

// === parseGtfsRouteStopRecord ===

test("parseGtfsRouteStopRecord parses a valid record", () => {
    const routeStop = parseGtfsRouteStopRecord(
        {
            route_id: "L10",
            direction_id: "0",
            stop_id: "U135N2_1",
            stop_sequence: "5",
        },
        GtfsFeedId.PID,
    );

    assert.deepEqual(routeStop, {
        feedId: GtfsFeedId.PID,
        routeId: "L10",
        directionId: "0",
        platformId: "U135N2",
        stopSequence: 5,
    });
});

test("parseGtfsRouteStopRecord throws for non-integer stop_sequence", () => {
    assert.throws(
        () =>
            parseGtfsRouteStopRecord(
                {
                    route_id: "L10",
                    direction_id: "0",
                    stop_id: "U1",
                    stop_sequence: "1.5",
                },
                GtfsFeedId.PID,
            ),
        /Invalid GTFS stop sequence/,
    );
});

// === parseGtfsRouteRecord ===

test("parseGtfsRouteRecord parses a full record with night flag", () => {
    const route = parseGtfsRouteRecord(
        {
            route_id: "L10",
            route_short_name: "10",
            route_long_name: "Night Bus Ten",
            route_type: "3",
            route_color: "FF0000",
            is_night: "1",
            route_url: "https://example.com",
        },
        GtfsFeedId.PID,
    );

    assert.equal(route.id, "L10");
    assert.equal(route.feedId, GtfsFeedId.PID);
    assert.equal(route.shortName, "10");
    assert.equal(route.longName, "Night Bus Ten");
    assert.equal(route.color, "FF0000");
    assert.equal(route.isNight, true);
    assert.equal(route.url, "https://example.com");
});

test("parseGtfsRouteRecord handles optional fields absent", () => {
    const route = parseGtfsRouteRecord(
        {
            route_id: "L20",
            route_short_name: "20",
            route_type: "3",
        },
        GtfsFeedId.PID,
    );

    assert.equal(route.longName, null);
    assert.equal(route.color, null);
    assert.equal(route.isNight, null);
    assert.equal(route.url, null);
});

test("parseGtfsRouteRecord throws for missing required fields", () => {
    assert.throws(
        () => parseGtfsRouteRecord({ route_id: "L10" }, GtfsFeedId.PID),
        /Invalid GTFS route record/,
    );
});

// === buildGtfsShapeDatasets (edge cases) ===

test("buildGtfsShapeDatasets ignores trips without a shapeId", () => {
    const datasets = buildGtfsShapeDatasets({
        feedId: GtfsFeedId.PID,
        trips: [{ routeId: "L1", directionId: "0", shapeId: null }],
        shapePoints: [],
        routeIdsWithImportedPlatforms: new Set(["L1"]),
    });

    assert.equal(datasets.gtfsRouteShapes.length, 0);
});

test("buildGtfsShapeDatasets ignores trips for routes not in routeIdsWithImportedPlatforms", () => {
    const datasets = buildGtfsShapeDatasets({
        feedId: GtfsFeedId.PID,
        trips: [{ routeId: "L99", directionId: "0", shapeId: "shape-a" }],
        shapePoints: [
            {
                shapeId: "shape-a",
                latitude: 50.1,
                longitude: 14.4,
                sequence: 1,
            },
            {
                shapeId: "shape-a",
                latitude: 50.2,
                longitude: 14.5,
                sequence: 2,
            },
        ],
        routeIdsWithImportedPlatforms: new Set(["L1"]),
    });

    assert.equal(datasets.gtfsRouteShapes.length, 0);
});

test("buildGtfsShapeDatasets returns empty result for empty trips", () => {
    const datasets = buildGtfsShapeDatasets({
        feedId: GtfsFeedId.PID,
        trips: [],
        shapePoints: [],
        routeIdsWithImportedPlatforms: new Set(["L1"]),
    });

    assert.equal(datasets.gtfsRouteShapes.length, 0);
});

test("buildGtfsShapeDatasets selects shape with more coordinates as primary when tripCounts are equal", () => {
    const datasets = buildGtfsShapeDatasets({
        feedId: GtfsFeedId.PID,
        trips: [
            { routeId: "L1", directionId: "0", shapeId: "short-shape" },
            { routeId: "L1", directionId: "0", shapeId: "long-shape" },
        ],
        shapePoints: [
            {
                shapeId: "short-shape",
                latitude: 50.1,
                longitude: 14.4,
                sequence: 1,
            },
            {
                shapeId: "short-shape",
                latitude: 50.2,
                longitude: 14.5,
                sequence: 2,
            },
            {
                shapeId: "long-shape",
                latitude: 50.1,
                longitude: 14.4,
                sequence: 1,
            },
            {
                shapeId: "long-shape",
                latitude: 50.15,
                longitude: 14.45,
                sequence: 2,
            },
            {
                shapeId: "long-shape",
                latitude: 50.2,
                longitude: 14.5,
                sequence: 3,
            },
        ],
        routeIdsWithImportedPlatforms: new Set(["L1"]),
    });

    const primaryShape = datasets.gtfsRouteShapes.find((s) => s.isPrimary);

    assert.equal(primaryShape?.shapeId, "long-shape");
});

test("buildGtfsShapeDatasets sorts shape points by sequence when building coordinates", () => {
    const datasets = buildGtfsShapeDatasets({
        feedId: GtfsFeedId.PID,
        trips: [{ routeId: "L1", directionId: "0", shapeId: "shape-a" }],
        shapePoints: [
            {
                shapeId: "shape-a",
                latitude: 50.3,
                longitude: 14.6,
                sequence: 3,
            },
            {
                shapeId: "shape-a",
                latitude: 50.1,
                longitude: 14.4,
                sequence: 1,
            },
            {
                shapeId: "shape-a",
                latitude: 50.2,
                longitude: 14.5,
                sequence: 2,
            },
        ],
        routeIdsWithImportedPlatforms: new Set(["L1"]),
    });

    const coordinates = datasets.gtfsRouteShapes[0]?.geoJson.coordinates;

    assert.deepEqual(coordinates, [
        [14.4, 50.1],
        [14.5, 50.2],
        [14.6, 50.3],
    ]);
});

// === buildGtfsStationEntranceDataset (edge cases) ===

test("buildGtfsStationEntranceDataset ignores non-entrance stops", () => {
    const datasets = buildGtfsStationEntranceDataset({
        feedId: GtfsFeedId.PID,
        stops: [
            {
                id: "U1072S1",
                name: "Mustek station",
                latitude: 50.08,
                longitude: 14.42,
                locationType: "1",
                parentStationId: null,
            },
            {
                id: "U1072P1",
                name: "Mustek platform",
                latitude: 50.08,
                longitude: 14.42,
                locationType: "0",
                parentStationId: "U1072S1",
            },
        ],
        importedMetroStopIds: new Set(["U1072"]),
    });

    assert.equal(datasets.gtfsStationEntrances.length, 0);
});

test("buildGtfsStationEntranceDataset throws for entrance missing parentStationId", () => {
    assert.throws(
        () =>
            buildGtfsStationEntranceDataset({
                feedId: GtfsFeedId.PID,
                stops: [
                    {
                        id: "U1072E1",
                        name: "Entrance without parent",
                        latitude: 50.08,
                        longitude: 14.42,
                        locationType: "2",
                        parentStationId: null,
                    },
                ],
                importedMetroStopIds: new Set(["U1072"]),
            }),
        /missing parent_station/,
    );
});

test("buildGtfsStationEntranceDataset ignores entrances for non-imported stops", () => {
    const datasets = buildGtfsStationEntranceDataset({
        feedId: GtfsFeedId.PID,
        stops: [
            {
                id: "U9999E1",
                name: "Entrance for non-metro stop",
                latitude: 50.1,
                longitude: 14.5,
                locationType: "2",
                parentStationId: "U9999S1",
            },
        ],
        importedMetroStopIds: new Set(["U1072"]),
    });

    assert.equal(datasets.gtfsStationEntrances.length, 0);
});

test("buildGtfsStationEntranceDataset throws for parentStationId with unexpected format", () => {
    assert.throws(
        () =>
            buildGtfsStationEntranceDataset({
                feedId: GtfsFeedId.PID,
                stops: [
                    {
                        id: "badE1",
                        name: "Entrance with bad parent",
                        latitude: 50.08,
                        longitude: 14.42,
                        locationType: "2",
                        parentStationId: "NOFORMAT",
                    },
                ],
                importedMetroStopIds: new Set(["NOFORMAT"]),
            }),
        /Unexpected GTFS parent_station format/,
    );
});

test("buildGtfsStationEntranceDataset sorts entrances by stopId, parentStationId, id", () => {
    const datasets = buildGtfsStationEntranceDataset({
        feedId: GtfsFeedId.PID,
        stops: [
            {
                id: "U2000E2",
                name: "Second entrance",
                latitude: 50.09,
                longitude: 14.43,
                locationType: "2",
                parentStationId: "U2000S1",
            },
            {
                id: "U1000E1",
                name: "First stop entrance",
                latitude: 50.08,
                longitude: 14.42,
                locationType: "2",
                parentStationId: "U1000S1",
            },
            {
                id: "U2000E1",
                name: "First entrance",
                latitude: 50.085,
                longitude: 14.425,
                locationType: "2",
                parentStationId: "U2000S1",
            },
        ],
        importedMetroStopIds: new Set(["U1000", "U2000"]),
    });

    const ids = datasets.gtfsStationEntrances.map((e) => e.id);

    assert.deepEqual(ids, ["U1000E1", "U2000E1", "U2000E2"]);
});
