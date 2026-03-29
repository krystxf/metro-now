import assert from "node:assert/strict";
import test from "node:test";

import { SyncSnapshotValidator } from "./sync-snapshot-validator.service";

const createSnapshot = () => ({
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
