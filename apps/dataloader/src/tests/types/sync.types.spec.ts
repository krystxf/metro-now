import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "src/types/sync.types";
import { getSyncCounts } from "src/types/sync.types";

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

describe("getSyncCounts", () => {
    it("returns the correct count for each entity type", () => {
        const snapshot = createMinimalSnapshot();
        const counts = getSyncCounts(snapshot);

        expect(counts.stops).toBe(1);
        expect(counts.platforms).toBe(1);
        expect(counts.routes).toBe(1);
        expect(counts.platformRoutes).toBe(1);
        expect(counts.gtfsRoutes).toBe(1);
        expect(counts.gtfsRouteStops).toBe(1);
        expect(counts.gtfsRouteShapes).toBe(1);
        expect(counts.gtfsStationEntrances).toBe(0);
        expect(counts.gtfsTrips).toBe(0);
        expect(counts.gtfsStopTimes).toBe(0);
        expect(counts.gtfsCalendars).toBe(0);
        expect(counts.gtfsCalendarDates).toBe(0);
        expect(counts.gtfsTransfers).toBe(0);
    });

    it("reflects multiple items per entity", () => {
        const snapshot = createMinimalSnapshot();

        snapshot.stops.push({
            id: "S2",
            name: "Stop 2",
            avgLatitude: 50.1,
            avgLongitude: 14.1,
        });

        const counts = getSyncCounts(snapshot);

        expect(counts.stops).toBe(2);
    });
});
