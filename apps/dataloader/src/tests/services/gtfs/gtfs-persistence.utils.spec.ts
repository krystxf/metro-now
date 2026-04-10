import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import { buildGtfsPersistenceSnapshot } from "../../../services/gtfs/gtfs-persistence.utils";

test("buildGtfsPersistenceSnapshot parses trips with all optional fields", () => {
    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.PID,
        trips: [
            {
                trip_id: "T1",
                route_id: "R1",
                service_id: "S1",
                direction_id: "0",
                shape_id: "SH1",
                trip_headsign: "Terminus",
                block_id: "B1",
                wheelchair_accessible: "1",
                bikes_allowed: "2",
            },
        ],
        stopTimes: [],
    });

    assert.equal(result.gtfsTrips.length, 1);
    assert.deepEqual(result.gtfsTrips[0], {
        id: "PID::T1",
        feedId: GtfsFeedId.PID,
        tripId: "T1",
        routeId: "R1",
        serviceId: "S1",
        directionId: "0",
        shapeId: "SH1",
        tripHeadsign: "Terminus",
        blockId: "B1",
        wheelchairAccessible: "1",
        bikesAllowed: "2",
        rawData: {
            trip_id: "T1",
            route_id: "R1",
            service_id: "S1",
            direction_id: "0",
            shape_id: "SH1",
            trip_headsign: "Terminus",
            block_id: "B1",
            wheelchair_accessible: "1",
            bikes_allowed: "2",
        },
    });
});

test("buildGtfsPersistenceSnapshot treats missing optional trip fields as null", () => {
    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.PID,
        trips: [
            {
                trip_id: "T1",
                route_id: "R1",
            },
        ],
        stopTimes: [],
    });

    const trip = result.gtfsTrips[0];

    assert.equal(trip?.serviceId, null);
    assert.equal(trip?.directionId, null);
    assert.equal(trip?.shapeId, null);
    assert.equal(trip?.tripHeadsign, null);
    assert.equal(trip?.blockId, null);
    assert.equal(trip?.wheelchairAccessible, null);
    assert.equal(trip?.bikesAllowed, null);
});

test("buildGtfsPersistenceSnapshot rejects trips missing trip_id", () => {
    assert.throws(
        () =>
            buildGtfsPersistenceSnapshot({
                feedId: GtfsFeedId.PID,
                trips: [{ route_id: "R1" }],
                stopTimes: [],
            }),
        /Missing GTFS trip_id/,
    );
});

test("buildGtfsPersistenceSnapshot rejects trips missing route_id", () => {
    assert.throws(
        () =>
            buildGtfsPersistenceSnapshot({
                feedId: GtfsFeedId.PID,
                trips: [{ trip_id: "T1" }],
                stopTimes: [],
            }),
        /Missing GTFS route_id/,
    );
});

test("buildGtfsPersistenceSnapshot parses stop times", () => {
    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.PID,
        trips: [{ trip_id: "T1", route_id: "R1" }],
        stopTimes: [
            {
                trip_id: "T1",
                stop_id: "P1",
                stop_sequence: "1",
                arrival_time: "08:00:00",
                departure_time: "08:01:00",
                pickup_type: "0",
                drop_off_type: "1",
                timepoint: "1",
            },
        ],
    });

    assert.equal(result.gtfsStopTimes.length, 1);

    const stopTime = result.gtfsStopTimes[0];

    assert.equal(stopTime?.tripId, "T1");
    assert.equal(stopTime?.stopId, "P1");
    assert.equal(stopTime?.platformId, "P1");
    assert.equal(stopTime?.stopSequence, 1);
    assert.equal(stopTime?.arrivalTime, "08:00:00");
    assert.equal(stopTime?.departureTime, "08:01:00");
    assert.equal(stopTime?.pickupType, "0");
    assert.equal(stopTime?.dropOffType, "1");
    assert.equal(stopTime?.timepoint, "1");
});

test("buildGtfsPersistenceSnapshot rejects stop times with non-integer stop_sequence", () => {
    assert.throws(
        () =>
            buildGtfsPersistenceSnapshot({
                feedId: GtfsFeedId.PID,
                trips: [],
                stopTimes: [
                    {
                        trip_id: "T1",
                        stop_id: "P1",
                        stop_sequence: "abc",
                    },
                ],
            }),
        /Invalid GTFS integer/,
    );
});

test("buildGtfsPersistenceSnapshot parses calendars", () => {
    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.PID,
        trips: [],
        stopTimes: [],
        calendars: [
            {
                service_id: "S1",
                monday: "1",
                tuesday: "1",
                wednesday: "1",
                thursday: "1",
                friday: "1",
                saturday: "0",
                sunday: "0",
                start_date: "20260101",
                end_date: "20261231",
            },
        ],
    });

    assert.equal(result.gtfsCalendars.length, 1);

    const calendar = result.gtfsCalendars[0];

    assert.equal(calendar?.id, "PID::S1");
    assert.equal(calendar?.serviceId, "S1");
    assert.equal(calendar?.monday, true);
    assert.equal(calendar?.saturday, false);
    assert.equal(calendar?.startDate, "20260101");
    assert.equal(calendar?.endDate, "20261231");
});

test("buildGtfsPersistenceSnapshot rejects calendars with invalid binary flags", () => {
    assert.throws(
        () =>
            buildGtfsPersistenceSnapshot({
                feedId: GtfsFeedId.PID,
                trips: [],
                stopTimes: [],
                calendars: [
                    {
                        service_id: "S1",
                        monday: "yes",
                        tuesday: "1",
                        wednesday: "1",
                        thursday: "1",
                        friday: "1",
                        saturday: "0",
                        sunday: "0",
                    },
                ],
            }),
        /Invalid GTFS binary flag/,
    );
});

test("buildGtfsPersistenceSnapshot parses calendar dates", () => {
    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.PID,
        trips: [],
        stopTimes: [],
        calendarDates: [
            {
                service_id: "S1",
                date: "20260101",
                exception_type: "2",
            },
        ],
    });

    assert.equal(result.gtfsCalendarDates.length, 1);

    const calendarDate = result.gtfsCalendarDates[0];

    assert.equal(calendarDate?.id, "PID::S1::20260101::2");
    assert.equal(calendarDate?.serviceId, "S1");
    assert.equal(calendarDate?.date, "20260101");
    assert.equal(calendarDate?.exceptionType, 2);
});

test("buildGtfsPersistenceSnapshot parses transfers", () => {
    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.PID,
        trips: [],
        stopTimes: [],
        transfers: [
            {
                from_stop_id: "P1",
                to_stop_id: "P2",
                transfer_type: "2",
                min_transfer_time: "120",
            },
        ],
    });

    assert.equal(result.gtfsTransfers.length, 1);

    const transfer = result.gtfsTransfers[0];

    assert.equal(transfer?.fromStopId, "P1");
    assert.equal(transfer?.toStopId, "P2");
    assert.equal(transfer?.transferType, 2);
    assert.equal(transfer?.minTransferTime, 120);
    assert.equal(transfer?.fromRouteId, null);
    assert.equal(transfer?.toRouteId, null);
    assert.equal(transfer?.fromTripId, null);
    assert.equal(transfer?.toTripId, null);
});

test("buildGtfsPersistenceSnapshot applies custom ID mappers", () => {
    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.BRNO,
        trips: [
            {
                trip_id: "T1",
                route_id: "R1",
                service_id: "S1",
            },
        ],
        stopTimes: [
            {
                trip_id: "T1",
                stop_id: "P1",
                stop_sequence: "1",
            },
        ],
        calendars: [
            {
                service_id: "S1",
                monday: "1",
                tuesday: "1",
                wednesday: "1",
                thursday: "1",
                friday: "1",
                saturday: "0",
                sunday: "0",
            },
        ],
        mapRouteId: (id) => `BRR:${id}`,
        mapStopId: (id) => `BRP:${id}`,
        mapTripId: (id) => `BRT:${id}`,
        mapServiceId: (id) => `BRS:${id}`,
    });

    assert.equal(result.gtfsTrips[0]?.routeId, "BRR:R1");
    assert.equal(result.gtfsTrips[0]?.tripId, "BRT:T1");
    assert.equal(result.gtfsTrips[0]?.serviceId, "BRS:S1");
    assert.equal(result.gtfsStopTimes[0]?.stopId, "BRP:P1");
    assert.equal(result.gtfsCalendars[0]?.serviceId, "BRS:S1");
});

test("buildGtfsPersistenceSnapshot generates stable transfer IDs", () => {
    const build = () =>
        buildGtfsPersistenceSnapshot({
            feedId: GtfsFeedId.PID,
            trips: [],
            stopTimes: [],
            transfers: [
                {
                    from_stop_id: "P1",
                    to_stop_id: "P2",
                    transfer_type: "1",
                },
            ],
        });

    const first = build();
    const second = build();

    assert.equal(first.gtfsTransfers[0]?.id, second.gtfsTransfers[0]?.id);
});

test("buildGtfsPersistenceSnapshot normalizes undefined row values to empty strings in rawData", () => {
    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.PID,
        trips: [
            {
                trip_id: "T1",
                route_id: "R1",
                direction_id: undefined as unknown as string,
            },
        ],
        stopTimes: [],
    });

    assert.equal(result.gtfsTrips[0]?.rawData.direction_id, "");
});
