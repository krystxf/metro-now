import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import {
    GtfsService,
    buildGtfsShapeDatasets,
    buildGtfsStationEntranceDataset,
} from "../../../services/gtfs/gtfs.service";

test("buildGtfsShapeDatasets derives route geometries and primary shapes", () => {
    const datasets = buildGtfsShapeDatasets({
        feedId: GtfsFeedId.PID,
        trips: [
            {
                routeId: "L1",
                directionId: "0",
                shapeId: "shape-a",
            },
            {
                routeId: "L1",
                directionId: "0",
                shapeId: "shape-a",
            },
            {
                routeId: "L1",
                directionId: "0",
                shapeId: "shape-b",
            },
            {
                routeId: "L1",
                directionId: "1",
                shapeId: "shape-c",
            },
            {
                routeId: "L2",
                directionId: "0",
                shapeId: "shape-a",
            },
            {
                routeId: "ignored-route",
                directionId: "0",
                shapeId: "shape-c",
            },
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

test("GtfsService parses blank stop names for non-entrance GTFS locations", () => {
    const service = new GtfsService() as unknown as {
        parseGtfsStopRecord(stop: Record<string, string>): {
            id: string;
            name: string;
            latitude: number;
            longitude: number;
            locationType: string;
            parentStationId: string | null;
        };
    };

    const parsed = service.parseGtfsStopRecord({
        stop_id: "U135N2",
        stop_name: "",
        stop_lat: "50.106538",
        stop_lon: "14.537558",
        location_type: "3",
        parent_station: "U135S1",
    });

    assert.deepEqual(parsed, {
        id: "U135N2",
        name: "",
        latitude: 50.106538,
        longitude: 14.537558,
        locationType: "3",
        parentStationId: "U135S1",
    });
});
