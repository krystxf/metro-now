import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { getSyncCounts } from "../../types/sync.types";

const createMinimalSnapshot = (): SyncSnapshot => ({
    stops: [{ id: "S1", name: "Stop", avgLatitude: 50, avgLongitude: 14 }],
    platforms: [
        {
            id: "P1",
            name: "Platform",
            code: "1",
            isMetro: false,
            latitude: 50,
            longitude: 14,
            stopId: "S1",
        },
    ],
    routes: [{ id: "R1", name: "Route", vehicleType: null, isNight: false }],
    platformRoutes: [{ platformId: "P1", routeId: "R1" }],
    gtfsRoutes: [
        {
            id: "G1",
            feedId: GtfsFeedId.PID,
            shortName: "A",
            longName: null,
            type: "metro",
            color: null,
            isNight: false,
            url: null,
        },
    ],
    gtfsRouteStops: [
        {
            feedId: GtfsFeedId.PID,
            routeId: "G1",
            directionId: "0",
            platformId: "P1",
            stopSequence: 1,
        },
    ],
    gtfsRouteShapes: [
        {
            feedId: GtfsFeedId.PID,
            routeId: "G1",
            directionId: "0",
            shapeId: "sh1",
            tripCount: 1,
            isPrimary: true,
            geoJson: {
                type: "LineString" as const,
                coordinates: [
                    [14, 50],
                    [14.1, 50.1],
                ],
            },
        },
    ],
    gtfsStationEntrances: [],
    gtfsTrips: [],
    gtfsStopTimes: [],
    gtfsCalendars: [],
    gtfsCalendarDates: [],
    gtfsTransfers: [],
});

test("getSyncCounts returns the correct count for each entity type", () => {
    const snapshot = createMinimalSnapshot();
    const counts = getSyncCounts(snapshot);

    assert.equal(counts.stops, 1);
    assert.equal(counts.platforms, 1);
    assert.equal(counts.routes, 1);
    assert.equal(counts.platformRoutes, 1);
    assert.equal(counts.gtfsRoutes, 1);
    assert.equal(counts.gtfsRouteStops, 1);
    assert.equal(counts.gtfsRouteShapes, 1);
    assert.equal(counts.gtfsStationEntrances, 0);
    assert.equal(counts.gtfsTrips, 0);
    assert.equal(counts.gtfsStopTimes, 0);
    assert.equal(counts.gtfsCalendars, 0);
    assert.equal(counts.gtfsCalendarDates, 0);
    assert.equal(counts.gtfsTransfers, 0);
});

test("getSyncCounts reflects multiple items per entity", () => {
    const snapshot = createMinimalSnapshot();

    snapshot.stops.push({
        id: "S2",
        name: "Stop 2",
        avgLatitude: 50.1,
        avgLongitude: 14.1,
    });

    const counts = getSyncCounts(snapshot);

    assert.equal(counts.stops, 2);
});
