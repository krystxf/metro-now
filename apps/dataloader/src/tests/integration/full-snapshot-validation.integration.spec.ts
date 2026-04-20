import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import { buildGtfsPersistenceSnapshot } from "../../services/gtfs/gtfs-persistence.utils";
import {
    buildGtfsShapeDatasets,
    buildGtfsStationEntranceDataset,
} from "../../services/gtfs/gtfs.service";
import { PidImportService } from "../../services/imports/pid-import.service";
import { SyncSnapshotValidator } from "../../services/sync/sync-snapshot-validator.service";
import type { SyncSnapshot } from "../../types/sync.types";
import { parseCsvString } from "../../utils/csv.utils";

const buildTestSnapshot = async (): Promise<SyncSnapshot> => {
    const pidService = new PidImportService();

    const stopSnapshot = pidService.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            {
                name: "Můstek",
                node: 1072,
                avgLat: 50.0831,
                avgLon: 14.425,
                stops: [
                    {
                        lat: 50.0831,
                        lon: 14.425,
                        gtfsIds: ["U1072Z101P"],
                        altIdosName: "Můstek",
                        isMetro: true,
                        platform: "1",
                        lines: [{ id: "L991", name: "A", type: "METRO" }],
                    },
                    {
                        lat: 50.0839,
                        lon: 14.4241,
                        gtfsIds: ["U1072Z102P"],
                        altIdosName: "Můstek",
                        isMetro: true,
                        platform: "2",
                        lines: [{ id: "L991", name: "A", type: "METRO" }],
                    },
                ],
            },
            {
                name: "Malostranská",
                node: 456,
                avgLat: 50.0886,
                avgLon: 14.4098,
                stops: [
                    {
                        lat: 50.0886,
                        lon: 14.4098,
                        gtfsIds: ["U456Z101P"],
                        altIdosName: "Malostranská",
                        isMetro: true,
                        platform: "1",
                        lines: [{ id: "L991", name: "A", type: "METRO" }],
                    },
                    {
                        lat: 50.0887,
                        lon: 14.4099,
                        gtfsIds: ["U456Z102P"],
                        altIdosName: "Malostranská",
                        isMetro: true,
                        platform: "2",
                        lines: [{ id: "L991", name: "A", type: "METRO" }],
                    },
                ],
            },
        ],
    });

    const platformIds = new Set(stopSnapshot.platforms.map((p) => p.id));
    const metroStopIds = new Set(
        stopSnapshot.platforms.flatMap((p) =>
            p.isMetro && p.stopId ? [p.stopId] : [],
        ),
    );

    // GTFS shape data
    const { gtfsRouteShapes } = buildGtfsShapeDatasets({
        feedId: GtfsFeedId.PID,
        trips: [
            { routeId: "L991", directionId: "0", shapeId: "sh-a-0" },
            { routeId: "L991", directionId: "0", shapeId: "sh-a-0" },
            { routeId: "L991", directionId: "1", shapeId: "sh-a-1" },
        ],
        shapePoints: [
            {
                shapeId: "sh-a-0",
                latitude: 50.0886,
                longitude: 14.4098,
                sequence: 1,
            },
            {
                shapeId: "sh-a-0",
                latitude: 50.0831,
                longitude: 14.425,
                sequence: 2,
            },
            {
                shapeId: "sh-a-1",
                latitude: 50.0831,
                longitude: 14.425,
                sequence: 1,
            },
            {
                shapeId: "sh-a-1",
                latitude: 50.0886,
                longitude: 14.4098,
                sequence: 2,
            },
        ],
        routeIdsWithImportedPlatforms: new Set(["L991"]),
    });

    // GTFS station entrances
    const { gtfsStationEntrances } = buildGtfsStationEntranceDataset({
        feedId: GtfsFeedId.PID,
        stops: [
            {
                id: "U1072S1",
                name: "Můstek station",
                latitude: 50.0831,
                longitude: 14.425,
                locationType: "1",
                parentStationId: null,
            },
            {
                id: "U1072E1",
                name: "Můstek entrance A",
                latitude: 50.0833,
                longitude: 14.4252,
                locationType: "2",
                parentStationId: "U1072S1",
            },
            {
                id: "U1072E2",
                name: "Můstek entrance B",
                latitude: 50.0829,
                longitude: 14.4248,
                locationType: "2",
                parentStationId: "U1072S1",
            },
        ],
        importedMetroStopIds: metroStopIds,
    });

    // GTFS persistence data from CSV
    const tripsCsv = [
        "trip_id,route_id,service_id,direction_id,shape_id",
        "T1,L991,SVC1,0,sh-a-0",
        "T2,L991,SVC1,1,sh-a-1",
    ].join("\n");

    const stopTimesCsv = [
        "trip_id,stop_id,stop_sequence,arrival_time,departure_time",
        "T1,U456Z101P,1,06:00:00,06:00:30",
        "T1,U1072Z101P,2,06:05:00,06:05:30",
        "T2,U1072Z102P,1,06:10:00,06:10:30",
        "T2,U456Z102P,2,06:15:00,06:15:30",
    ].join("\n");

    const calendarsCsv = [
        "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date",
        "SVC1,1,1,1,1,1,0,0,20260101,20261231",
    ].join("\n");

    const calendarDatesCsv = [
        "service_id,date,exception_type",
        "SVC1,20260501,2",
    ].join("\n");

    const [trips, stopTimes, calendars, calendarDates] = await Promise.all([
        parseCsvString<Record<string, string>>(tripsCsv),
        parseCsvString<Record<string, string>>(stopTimesCsv),
        parseCsvString<Record<string, string>>(calendarsCsv),
        parseCsvString<Record<string, string>>(calendarDatesCsv),
    ]);

    const persistence = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.PID,
        trips,
        stopTimes,
        calendars,
        calendarDates,
    });

    return {
        ...stopSnapshot,
        gtfsRoutes: [
            {
                id: "L991",
                feedId: GtfsFeedId.PID,
                shortName: "A",
                longName: "Metro A",
                type: "metro",
                vehicleType: null,
                color: "#00A651",
                isNight: false,
                url: null,
            },
        ],
        gtfsRouteStops: [
            {
                feedId: GtfsFeedId.PID,
                routeId: "L991",
                directionId: "0",
                platformId: "U456Z101P",
                stopSequence: 0,
            },
            {
                feedId: GtfsFeedId.PID,
                routeId: "L991",
                directionId: "0",
                platformId: "U1072Z101P",
                stopSequence: 1,
            },
            {
                feedId: GtfsFeedId.PID,
                routeId: "L991",
                directionId: "1",
                platformId: "U1072Z102P",
                stopSequence: 0,
            },
            {
                feedId: GtfsFeedId.PID,
                routeId: "L991",
                directionId: "1",
                platformId: "U456Z102P",
                stopSequence: 1,
            },
        ],
        gtfsRouteShapes,
        gtfsStationEntrances,
        gtfsTrips: persistence.gtfsTrips,
        gtfsStopTimes: persistence.gtfsStopTimes,
        gtfsCalendars: persistence.gtfsCalendars,
        gtfsCalendarDates: persistence.gtfsCalendarDates,
        gtfsTransfers: [],
        gtfsFrequencies: persistence.gtfsFrequencies,
    };
};

test("integration: full snapshot from PID import + GTFS builders passes validation", async () => {
    const snapshot = await buildTestSnapshot();
    const validator = new SyncSnapshotValidator();

    assert.doesNotThrow(() => {
        validator.validate(snapshot);
    });
});

test("integration: full snapshot has consistent cross-references", async () => {
    const snapshot = await buildTestSnapshot();

    const stopIds = new Set(snapshot.stops.map((s) => s.id));
    const platformIds = new Set(snapshot.platforms.map((p) => p.id));
    const routeIds = new Set(snapshot.routes.map((r) => r.id));
    const gtfsRouteIds = new Set(snapshot.gtfsRoutes.map((r) => r.id));

    // all platforms reference valid stops
    for (const platform of snapshot.platforms) {
        if (platform.stopId) {
            assert.ok(
                stopIds.has(platform.stopId),
                `Platform ${platform.id} → stop ${platform.stopId}`,
            );
        }
    }

    // all platform routes reference valid platforms and routes
    for (const pr of snapshot.platformRoutes) {
        assert.ok(
            platformIds.has(pr.platformId),
            `PlatformRoute → platform ${pr.platformId}`,
        );
        assert.ok(
            routeIds.has(pr.routeId),
            `PlatformRoute → route ${pr.routeId}`,
        );
    }

    // all GTFS route stops reference valid GTFS routes and platforms
    for (const rs of snapshot.gtfsRouteStops) {
        assert.ok(
            gtfsRouteIds.has(rs.routeId),
            `GtfsRouteStop → route ${rs.routeId}`,
        );
        assert.ok(
            platformIds.has(rs.platformId),
            `GtfsRouteStop → platform ${rs.platformId}`,
        );
    }

    // all GTFS route shapes reference valid GTFS routes
    for (const shape of snapshot.gtfsRouteShapes) {
        assert.ok(
            gtfsRouteIds.has(shape.routeId),
            `GtfsRouteShape → route ${shape.routeId}`,
        );
    }

    // all GTFS station entrances reference valid stops
    for (const entrance of snapshot.gtfsStationEntrances) {
        assert.ok(
            stopIds.has(entrance.stopId),
            `GtfsStationEntrance → stop ${entrance.stopId}`,
        );
    }

    // all GTFS trips reference valid GTFS routes
    for (const trip of snapshot.gtfsTrips) {
        assert.ok(
            gtfsRouteIds.has(trip.routeId),
            `GtfsTrip → route ${trip.routeId}`,
        );
    }
});

test("integration: full snapshot entity counts are correct", async () => {
    const snapshot = await buildTestSnapshot();

    assert.equal(snapshot.stops.length, 2);
    assert.equal(snapshot.platforms.length, 4);
    assert.equal(snapshot.routes.length, 1);
    assert.equal(snapshot.gtfsRoutes.length, 1);
    assert.equal(snapshot.gtfsRouteStops.length, 4);
    assert.equal(snapshot.gtfsRouteShapes.length, 2);
    assert.equal(snapshot.gtfsStationEntrances.length, 2);
    assert.equal(snapshot.gtfsTrips.length, 2);
    assert.equal(snapshot.gtfsStopTimes.length, 4);
    assert.equal(snapshot.gtfsCalendars.length, 1);
    assert.equal(snapshot.gtfsCalendarDates.length, 1);
    assert.equal(snapshot.gtfsTransfers.length, 0);
});

test("integration: each route direction has exactly one primary shape", async () => {
    const snapshot = await buildTestSnapshot();

    const primaryByDirection = new Map<string, number>();

    for (const shape of snapshot.gtfsRouteShapes) {
        if (!shape.isPrimary) {
            continue;
        }

        const key = `${shape.routeId}::${shape.directionId}`;
        const count = (primaryByDirection.get(key) ?? 0) + 1;

        primaryByDirection.set(key, count);
    }

    for (const [key, count] of primaryByDirection) {
        assert.equal(count, 1, `Direction ${key} has ${count} primary shapes`);
    }
});

test("integration: GTFS station entrances are only for metro stops", async () => {
    const snapshot = await buildTestSnapshot();

    const metroStopIds = new Set(
        snapshot.platforms.flatMap((p) =>
            p.isMetro && p.stopId ? [p.stopId] : [],
        ),
    );

    for (const entrance of snapshot.gtfsStationEntrances) {
        assert.ok(
            metroStopIds.has(entrance.stopId),
            `Entrance ${entrance.id} references non-metro stop ${entrance.stopId}`,
        );
    }
});
