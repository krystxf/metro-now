import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
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
            feedId: GtfsFeedId.PID,
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
            feedId: GtfsFeedId.PID,
            routeId: "L1",
            directionId: "0",
            platformId: "P1",
            stopSequence: 1,
        },
    ],
    gtfsRouteShapes: [
        {
            feedId: GtfsFeedId.PID,
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
            feedId: GtfsFeedId.PID,
            stopId: "U1",
            parentStationId: "U1S1",
            name: "Entrance 1",
            latitude: 50.1005,
            longitude: 14.4005,
        },
    ],
    gtfsTrips: [
        {
            id: "PID::T1",
            feedId: GtfsFeedId.PID,
            tripId: "T1",
            routeId: "L1",
            serviceId: "S1",
            directionId: "0",
            shapeId: "shape-1",
            tripHeadsign: null,
            blockId: null,
            wheelchairAccessible: null,
            bikesAllowed: null,
            rawData: {
                trip_id: "T1",
                route_id: "L1",
            },
        },
    ],
    gtfsStopTimes: [
        {
            id: "PID::T1::1::P1",
            feedId: GtfsFeedId.PID,
            tripId: "T1",
            stopId: "P1",
            platformId: "P1",
            stopSequence: 1,
            arrivalTime: "08:00:00",
            departureTime: "08:00:00",
            pickupType: null,
            dropOffType: null,
            timepoint: null,
            rawData: {
                trip_id: "T1",
                stop_id: "P1",
                stop_sequence: "1",
            },
        },
    ],
    gtfsCalendars: [
        {
            id: "PID::S1",
            feedId: GtfsFeedId.PID,
            serviceId: "S1",
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false,
            startDate: "20260101",
            endDate: "20261231",
            rawData: {
                service_id: "S1",
            },
        },
    ],
    gtfsCalendarDates: [
        {
            id: "PID::S1::20260101::1",
            feedId: GtfsFeedId.PID,
            serviceId: "S1",
            date: "20260101",
            exceptionType: 1,
            rawData: {
                service_id: "S1",
                date: "20260101",
                exception_type: "1",
            },
        },
    ],
    gtfsTransfers: [],
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

test("SyncSnapshotValidator rejects empty stops dataset", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.stops = [];

    assert.throws(() => {
        validator.validate(snapshot);
    }, /empty stops dataset/);
});

test("SyncSnapshotValidator rejects empty platforms dataset", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.platforms = [];

    assert.throws(() => {
        validator.validate(snapshot);
    }, /empty platforms dataset/);
});

test("SyncSnapshotValidator rejects duplicate stop IDs", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.stops.push({ ...snapshot.stops[0] });

    assert.throws(() => {
        validator.validate(snapshot);
    }, /Duplicate stops record/);
});

test("SyncSnapshotValidator rejects duplicate platform IDs", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.platforms.push({ ...snapshot.platforms[0] });

    assert.throws(() => {
        validator.validate(snapshot);
    }, /Duplicate platforms record/);
});

test("SyncSnapshotValidator rejects platform referencing missing stop", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.platforms[0] = {
        ...snapshot.platforms[0],
        stopId: "missing-stop",
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /missing stop 'missing-stop'/);
});

test("SyncSnapshotValidator rejects platform route referencing missing platform", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.platformRoutes[0] = {
        ...snapshot.platformRoutes[0],
        platformId: "missing-platform",
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /missing platform 'missing-platform'/);
});

test("SyncSnapshotValidator rejects platform route referencing missing route", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.platformRoutes[0] = {
        ...snapshot.platformRoutes[0],
        routeId: "missing-route",
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /missing route 'missing-route'/);
});

test("SyncSnapshotValidator rejects GTFS route stop with negative stop sequence", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsRouteStops[0] = {
        ...snapshot.gtfsRouteStops[0],
        stopSequence: -1,
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /invalid stop sequence/);
});

test("SyncSnapshotValidator rejects GTFS route shape with invalid trip count", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsRouteShapes[0] = {
        ...snapshot.gtfsRouteShapes[0],
        tripCount: 0,
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /invalid trip count/);
});

test("SyncSnapshotValidator rejects GTFS route shape with insufficient coordinates", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsRouteShapes[0] = {
        ...snapshot.gtfsRouteShapes[0],
        geoJson: {
            type: "LineString" as const,
            coordinates: [[14.4, 50.1]],
        },
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /insufficient coordinates/);
});

test("SyncSnapshotValidator rejects GTFS route shape with invalid longitude", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsRouteShapes[0] = {
        ...snapshot.gtfsRouteShapes[0],
        geoJson: {
            type: "LineString" as const,
            coordinates: [
                [200, 50.1],
                [14.5, 50.2],
            ] as [number, number][],
        },
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /invalid longitude '200'/);
});

test("SyncSnapshotValidator rejects GTFS trip referencing missing route", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsTrips[0] = {
        ...snapshot.gtfsTrips[0],
        routeId: "missing-route",
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /missing route 'missing-route'/);
});

test("SyncSnapshotValidator rejects GTFS stop time referencing missing trip", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsStopTimes[0] = {
        ...snapshot.gtfsStopTimes[0],
        tripId: "missing-trip",
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /missing trip 'missing-trip'/);
});

test("SyncSnapshotValidator rejects GTFS stop time with negative stop sequence", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsStopTimes[0] = {
        ...snapshot.gtfsStopTimes[0],
        stopSequence: -1,
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /invalid stop sequence/);
});

test("SyncSnapshotValidator rejects GTFS calendar date with invalid exception type", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsCalendarDates[0] = {
        ...snapshot.gtfsCalendarDates[0],
        exceptionType: 0,
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /invalid exception type/);
});

test("SyncSnapshotValidator rejects multiple primary shapes for same route direction", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsRouteShapes.push({
        ...snapshot.gtfsRouteShapes[0],
        shapeId: "shape-2",
        isPrimary: true,
    });

    assert.throws(() => {
        validator.validate(snapshot);
    }, /multiple primary shapes/);
});

test("SyncSnapshotValidator rejects missing primary shape for a route direction", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsRouteShapes[0] = {
        ...snapshot.gtfsRouteShapes[0],
        isPrimary: false,
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /missing primary shape/);
});

test("SyncSnapshotValidator rejects GTFS station entrance with invalid latitude", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsStationEntrances[0] = {
        ...snapshot.gtfsStationEntrances[0],
        latitude: -91,
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /invalid latitude/);
});

test("SyncSnapshotValidator rejects GTFS station entrance with invalid longitude", () => {
    const validator = new SyncSnapshotValidator();
    const snapshot = createSnapshot();

    snapshot.gtfsStationEntrances[0] = {
        ...snapshot.gtfsStationEntrances[0],
        longitude: 181,
    };

    assert.throws(() => {
        validator.validate(snapshot);
    }, /invalid longitude/);
});
