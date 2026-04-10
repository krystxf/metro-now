import { GtfsFeedId } from "@metro-now/database";

import { buildGtfsPersistenceSnapshot } from "src/services/gtfs/gtfs-persistence.utils";
import { parseCsvString } from "src/utils/csv.utils";

describe("buildGtfsPersistenceSnapshot (CSV integration)", () => {
    it("maps CSV trips + stop_times into a valid snapshot", async () => {
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

        expect(result.gtfsTrips).toHaveLength(3);
        expect(result.gtfsTrips[0]?.tripId).toBe("T100");
        expect(result.gtfsTrips[0]?.routeId).toBe("R10");
        expect(result.gtfsTrips[0]?.serviceId).toBe("S_WEEKDAY");
        expect(result.gtfsTrips[0]?.directionId).toBe("0");
        expect(result.gtfsTrips[0]?.shapeId).toBe("SH1");
        expect(result.gtfsTrips[0]?.tripHeadsign).toBe("Dejvická");
        expect(result.gtfsTrips[2]?.shapeId).toBeNull();

        expect(result.gtfsStopTimes).toHaveLength(4);
        expect(result.gtfsStopTimes[0]?.tripId).toBe("T100");
        expect(result.gtfsStopTimes[0]?.stopId).toBe("U1072Z101P");
        expect(result.gtfsStopTimes[0]?.stopSequence).toBe(1);
        expect(result.gtfsStopTimes[0]?.arrivalTime).toBe("06:00:00");
        expect(result.gtfsStopTimes[0]?.departureTime).toBe("06:00:30");

        expect(result.gtfsCalendars).toHaveLength(2);

        const weekday = result.gtfsCalendars.find(
            (c) => c.serviceId === "S_WEEKDAY",
        );

        expect(weekday).toBeDefined();
        expect(weekday?.monday).toBe(true);
        expect(weekday?.saturday).toBe(false);
        expect(weekday?.startDate).toBe("20260101");
        expect(weekday?.endDate).toBe("20261231");

        const weekend = result.gtfsCalendars.find(
            (c) => c.serviceId === "S_WEEKEND",
        );

        expect(weekend).toBeDefined();
        expect(weekend?.monday).toBe(false);
        expect(weekend?.saturday).toBe(true);

        expect(result.gtfsCalendarDates).toHaveLength(2);
        expect(result.gtfsCalendarDates[0]?.serviceId).toBe("S_WEEKDAY");
        expect(result.gtfsCalendarDates[0]?.date).toBe("20260501");
        expect(result.gtfsCalendarDates[0]?.exceptionType).toBe(2);
        expect(result.gtfsCalendarDates[1]?.exceptionType).toBe(1);

        expect(result.gtfsTransfers).toHaveLength(1);
        expect(result.gtfsTransfers[0]?.fromStopId).toBe("U1072Z101P");
        expect(result.gtfsTransfers[0]?.toStopId).toBe("U1072Z201P");
        expect(result.gtfsTransfers[0]?.transferType).toBe(2);
        expect(result.gtfsTransfers[0]?.minTransferTime).toBe(180);

        for (const trip of result.gtfsTrips) {
            expect(trip.id).toMatch(/^PID::/);
        }

        for (const stopTime of result.gtfsStopTimes) {
            expect(stopTime.id).toMatch(/^PID::/);
        }

        for (const calendar of result.gtfsCalendars) {
            expect(calendar.id).toMatch(/^PID::/);
        }
    });

    it("applies ID mappers to all identifiers end-to-end", async () => {
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

        expect(result.gtfsTrips[0]?.tripId).toBe("T:trip-1");
        expect(result.gtfsTrips[0]?.routeId).toBe("R:route-a");
        expect(result.gtfsTrips[0]?.serviceId).toBe("S:svc-1");

        expect(result.gtfsStopTimes[0]?.stopId).toBe("P:stop-x");
        expect(result.gtfsStopTimes[0]?.tripId).toBe("T:trip-1");

        expect(result.gtfsCalendars[0]?.serviceId).toBe("S:svc-1");

        expect(result.gtfsTransfers[0]?.fromStopId).toBe("P:stop-x");
        expect(result.gtfsTransfers[0]?.toStopId).toBe("P:stop-y");
        expect(result.gtfsTransfers[0]?.fromRouteId).toBe("R:route-a");
        expect(result.gtfsTransfers[0]?.toRouteId).toBe("R:route-b");
    });
});
