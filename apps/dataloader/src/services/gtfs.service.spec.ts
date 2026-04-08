import assert from "node:assert/strict";
import test from "node:test";

import { buildGtfsShapeDatasets } from "./gtfs.service";

test("buildGtfsShapeDatasets derives route geometries and primary shapes", () => {
    const datasets = buildGtfsShapeDatasets({
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
