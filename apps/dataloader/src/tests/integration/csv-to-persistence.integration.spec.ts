import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import { buildGtfsPersistenceSnapshot } from "../services/gtfs/gtfs-persistence.utils";
import { parseCsvString } from "../utils/csv.utils";

test("integration: CSV trips + stop_times → buildGtfsPersistenceSnapshot produces a valid snapshot", async () => {
    const tripsCsv = [
        "trip_id,route_id,service_id,direction_id,shape_id,trip_headsign",
        "T100,R10,S_WEEKDAY,0,SH1,Dejvická",
        "T101,R10,S_WEEKDAY,1,SH2,Háje",
        "T200,R20,S_WEEKEND,0,,Sídliště Barrandov",
    ].join("\n");

    const stopTimesCsv = [
        "trip_id,stop_id,stop_sequence,arrival_time,departure_time",
        "T100,U1072Z101P,1,06:00:00,06:00:30",
        "T100,U337Z102P,2,06:05:00,06:05:30",
        "T101,U337Z201P,1,06:10:00,06:10:30",
        "T200,U500Z1P,1,08:00:00,08:00:00",
    ].join("\n");

    const calendarsCsv = [
        "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date",
        "S_WEEKDAY,1,1,1,1,1,0,0,20260101,20261231",
        "S_WEEKEND,0,0,0,0,0,1,1,20260101,20261231",
    ].join("\n");

    const calendarDatesCsv = [
        "service_id,date,exception_type",
        "S_WEEKDAY,20260501,2",
        "S_WEEKEND,20260501,1",
    ].join("\n");

    const transfersCsv = [
        "from_stop_id,to_stop_id,transfer_type,min_transfer_time",
        "U1072Z101P,U1072Z201P,2,180",
    ].join("\n");

    const [trips, stopTimes, calendars, calendarDates, transfers] =
        await Promise.all([
            parseCsvString<Record<string, string>>(tripsCsv),
            parseCsvString<Record<string, string>>(stopTimesCsv),
            parseCsvString<Record<string, string>>(calendarsCsv),
            parseCsvString<Record<string, string>>(calendarDatesCsv),
            parseCsvString<Record<string, string>>(transfersCsv),
        ]);

    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.PID,
        trips,
        stopTimes,
        calendars,
        calendarDates,
        transfers,
    });

    // trips
    assert.equal(result.gtfsTrips.length, 3);
    assert.equal(result.gtfsTrips[0]?.tripId, "T100");
    assert.equal(result.gtfsTrips[0]?.routeId, "R10");
    assert.equal(result.gtfsTrips[0]?.serviceId, "S_WEEKDAY");
    assert.equal(result.gtfsTrips[0]?.directionId, "0");
    assert.equal(result.gtfsTrips[0]?.shapeId, "SH1");
    assert.equal(result.gtfsTrips[0]?.tripHeadsign, "Dejvická");
    assert.equal(result.gtfsTrips[2]?.shapeId, null);

    // stop times
    assert.equal(result.gtfsStopTimes.length, 4);
    assert.equal(result.gtfsStopTimes[0]?.tripId, "T100");
    assert.equal(result.gtfsStopTimes[0]?.stopId, "U1072Z101P");
    assert.equal(result.gtfsStopTimes[0]?.stopSequence, 1);
    assert.equal(result.gtfsStopTimes[0]?.arrivalTime, "06:00:00");
    assert.equal(result.gtfsStopTimes[0]?.departureTime, "06:00:30");

    // calendars
    assert.equal(result.gtfsCalendars.length, 2);

    const weekday = result.gtfsCalendars.find(
        (c) => c.serviceId === "S_WEEKDAY",
    );

    assert.ok(weekday);
    assert.equal(weekday.monday, true);
    assert.equal(weekday.saturday, false);
    assert.equal(weekday.startDate, "20260101");
    assert.equal(weekday.endDate, "20261231");

    const weekend = result.gtfsCalendars.find(
        (c) => c.serviceId === "S_WEEKEND",
    );

    assert.ok(weekend);
    assert.equal(weekend.monday, false);
    assert.equal(weekend.saturday, true);

    // calendar dates
    assert.equal(result.gtfsCalendarDates.length, 2);
    assert.equal(result.gtfsCalendarDates[0]?.serviceId, "S_WEEKDAY");
    assert.equal(result.gtfsCalendarDates[0]?.date, "20260501");
    assert.equal(result.gtfsCalendarDates[0]?.exceptionType, 2);
    assert.equal(result.gtfsCalendarDates[1]?.exceptionType, 1);

    // transfers
    assert.equal(result.gtfsTransfers.length, 1);
    assert.equal(result.gtfsTransfers[0]?.fromStopId, "U1072Z101P");
    assert.equal(result.gtfsTransfers[0]?.toStopId, "U1072Z201P");
    assert.equal(result.gtfsTransfers[0]?.transferType, 2);
    assert.equal(result.gtfsTransfers[0]?.minTransferTime, 180);

    // IDs follow the expected format
    for (const trip of result.gtfsTrips) {
        assert.match(trip.id, /^PID::/);
    }

    for (const stopTime of result.gtfsStopTimes) {
        assert.match(stopTime.id, /^PID::/);
    }

    for (const calendar of result.gtfsCalendars) {
        assert.match(calendar.id, /^PID::/);
    }
});

test("integration: CSV with ID mappers transforms all identifiers end-to-end", async () => {
    const tripsCsv = [
        "trip_id,route_id,service_id",
        "trip-1,route-a,svc-1",
    ].join("\n");

    const stopTimesCsv = [
        "trip_id,stop_id,stop_sequence",
        "trip-1,stop-x,1",
    ].join("\n");

    const calendarsCsv = [
        "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday",
        "svc-1,1,1,1,1,1,0,0",
    ].join("\n");

    const transfersCsv = [
        "from_stop_id,to_stop_id,from_route_id,to_route_id,transfer_type",
        "stop-x,stop-y,route-a,route-b,1",
    ].join("\n");

    const [trips, stopTimes, calendars, transfers] = await Promise.all([
        parseCsvString<Record<string, string>>(tripsCsv),
        parseCsvString<Record<string, string>>(stopTimesCsv),
        parseCsvString<Record<string, string>>(calendarsCsv),
        parseCsvString<Record<string, string>>(transfersCsv),
    ]);

    const prefix = (ns: string) => (id: string) => `${ns}:${id}`;

    const result = buildGtfsPersistenceSnapshot({
        feedId: GtfsFeedId.BRNO,
        trips,
        stopTimes,
        calendars,
        transfers,
        mapRouteId: prefix("R"),
        mapStopId: prefix("P"),
        mapTripId: prefix("T"),
        mapServiceId: prefix("S"),
    });

    assert.equal(result.gtfsTrips[0]?.tripId, "T:trip-1");
    assert.equal(result.gtfsTrips[0]?.routeId, "R:route-a");
    assert.equal(result.gtfsTrips[0]?.serviceId, "S:svc-1");

    assert.equal(result.gtfsStopTimes[0]?.stopId, "P:stop-x");
    assert.equal(result.gtfsStopTimes[0]?.tripId, "T:trip-1");

    assert.equal(result.gtfsCalendars[0]?.serviceId, "S:svc-1");

    assert.equal(result.gtfsTransfers[0]?.fromStopId, "P:stop-x");
    assert.equal(result.gtfsTransfers[0]?.toStopId, "P:stop-y");
    assert.equal(result.gtfsTransfers[0]?.fromRouteId, "R:route-a");
    assert.equal(result.gtfsTransfers[0]?.toRouteId, "R:route-b");
});
