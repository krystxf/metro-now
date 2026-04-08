import assert from "node:assert/strict";
import test from "node:test";

import type { SyncSnapshot } from "../types/sync.types";
import { SyncSnapshotValidator } from "./sync-snapshot-validator.service";

const createSnapshot = (): SyncSnapshot => ({
    stops: [
        {
            id: "U1",
            name: "Stop 1",
            avgLatitude: 50.1,
            avgLongitude: 14.4,
        },
    ],
    platforms: [
        {
            id: "P1",
            name: "Platform 1",
            code: "1",
            isMetro: true,
            latitude: 50.1,
            longitude: 14.4,
            stopId: "U1",
        },
    ],
    routes: [
        {
            id: "R1",
            name: "Route 1",
            vehicleType: null,
            isNight: false,
        },
    ],
    platformRoutes: [
        {
            platformId: "P1",
            routeId: "R1",
        },
    ],
    gtfsRoutes: [
        {
            id: "L1",
            shortName: "C",
            longName: "Line C",
            type: "metro",
            color: "#ff0000",
            isNight: false,
            url: null,
        },
    ],
    gtfsRouteStops: [
        {
            routeId: "L1",
            directionId: "0",
            platformId: "P1",
            stopSequence: 1,
        },
    ],
    gtfsRouteShapes: [
        {
            routeId: "L1",
            directionId: "0",
            shapeId: "shape-1",
            tripCount: 3,
            isPrimary: true,
            geoJson: {
                type: "LineString" as const,
                coordinates: [
                    [14.4, 50.1],
                    [14.5, 50.2],
                ],
            },
        },
    ],
    gtfsStationEntrances: [
        {
            id: "U1E1",
            stopId: "U1",
            parentStationId: "U1S1",
            name: "Entrance 1",
            latitude: 50.1005,
            longitude: 14.4005,
        },
    ],
});

test("SyncSnapshotValidator accepts a consistent snapshot", () => {
    const validator = new SyncSnapshotValidator();

    assert.doesNotThrow(() => {
        validator.validate(createSnapshot());
    });
});

test("SyncSnapshotValidator rejects missing platform references", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsRouteStops[0] = {
        ...snapshot.gtfsRouteStops[0],
        platformId: "missing-platform",
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /missing platform 'missing-platform'/);
});

test("SyncSnapshotValidator rejects missing GTFS route shape references", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsRouteShapes[0] = {
        ...snapshot.gtfsRouteShapes[0],
        routeId: "missing-route",
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /missing route 'missing-route'/);
});

test("SyncSnapshotValidator rejects invalid GTFS route shape GeoJSON", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsRouteShapes[0] = {
        ...snapshot.gtfsRouteShapes[0],
        geoJson: {
            ...snapshot.gtfsRouteShapes[0].geoJson,
            coordinates: [
                [14.4, 95],
                [14.5, 50.2],
            ] as [number, number][],
        },
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /invalid latitude '95'/);
});

test("SyncSnapshotValidator rejects missing GTFS station entrance stop references", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsStationEntrances[0] = {
        ...snapshot.gtfsStationEntrances[0],
        stopId: "missing-stop",
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /missing stop 'missing-stop'/);
});
