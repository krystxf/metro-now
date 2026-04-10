import { GtfsFeedId } from "@metro-now/database";

import { buildGtfsPersistenceSnapshot } from "src/services/gtfs/gtfs-persistence.utils";

describe("buildGtfsPersistenceSnapshot", () => {
    it("parses trips with all optional fields", () => {
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

        expect(result.gtfsTrips).toHaveLength(1);
        expect(result.gtfsTrips[0]).toEqual({
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

    it("treats missing optional trip fields as null", () => {
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

        expect(trip?.serviceId).toBeNull();
        expect(trip?.directionId).toBeNull();
        expect(trip?.shapeId).toBeNull();
        expect(trip?.tripHeadsign).toBeNull();
        expect(trip?.blockId).toBeNull();
        expect(trip?.wheelchairAccessible).toBeNull();
        expect(trip?.bikesAllowed).toBeNull();
    });

    it("rejects trips missing trip_id", () => {
        expect(() =>
            buildGtfsPersistenceSnapshot({
                feedId: GtfsFeedId.PID,
                trips: [{ route_id: "R1" }],
                stopTimes: [],
            }),
        ).toThrow(/Missing GTFS trip_id/);
    });

    it("rejects trips missing route_id", () => {
        expect(() =>
            buildGtfsPersistenceSnapshot({
                feedId: GtfsFeedId.PID,
                trips: [{ trip_id: "T1" }],
                stopTimes: [],
            }),
        ).toThrow(/Missing GTFS route_id/);
    });

    it("parses stop times", () => {
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

        expect(result.gtfsStopTimes).toHaveLength(1);

        const stopTime = result.gtfsStopTimes[0];

        expect(stopTime?.tripId).toBe("T1");
        expect(stopTime?.stopId).toBe("P1");
        expect(stopTime?.platformId).toBe("P1");
        expect(stopTime?.stopSequence).toBe(1);
        expect(stopTime?.arrivalTime).toBe("08:00:00");
        expect(stopTime?.departureTime).toBe("08:01:00");
        expect(stopTime?.pickupType).toBe("0");
        expect(stopTime?.dropOffType).toBe("1");
        expect(stopTime?.timepoint).toBe("1");
    });

    it("rejects stop times with non-integer stop_sequence", () => {
        expect(() =>
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
        ).toThrow(/Invalid GTFS integer/);
    });

    it("parses calendars", () => {
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

        expect(result.gtfsCalendars).toHaveLength(1);

        const calendar = result.gtfsCalendars[0];

        expect(calendar?.id).toBe("PID::S1");
        expect(calendar?.serviceId).toBe("S1");
        expect(calendar?.monday).toBe(true);
        expect(calendar?.saturday).toBe(false);
        expect(calendar?.startDate).toBe("20260101");
        expect(calendar?.endDate).toBe("20261231");
    });

    it("rejects calendars with invalid binary flags", () => {
        expect(() =>
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
        ).toThrow(/Invalid GTFS binary flag/);
    });

    it("parses calendar dates", () => {
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

        expect(result.gtfsCalendarDates).toHaveLength(1);

        const calendarDate = result.gtfsCalendarDates[0];

        expect(calendarDate?.id).toBe("PID::S1::20260101::2");
        expect(calendarDate?.serviceId).toBe("S1");
        expect(calendarDate?.date).toBe("20260101");
        expect(calendarDate?.exceptionType).toBe(2);
    });

    it("parses transfers", () => {
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

        expect(result.gtfsTransfers).toHaveLength(1);

        const transfer = result.gtfsTransfers[0];

        expect(transfer?.fromStopId).toBe("P1");
        expect(transfer?.toStopId).toBe("P2");
        expect(transfer?.transferType).toBe(2);
        expect(transfer?.minTransferTime).toBe(120);
        expect(transfer?.fromRouteId).toBeNull();
        expect(transfer?.toRouteId).toBeNull();
        expect(transfer?.fromTripId).toBeNull();
        expect(transfer?.toTripId).toBeNull();
    });

    it("applies custom ID mappers", () => {
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

        expect(result.gtfsTrips[0]?.routeId).toBe("BRR:R1");
        expect(result.gtfsTrips[0]?.tripId).toBe("BRT:T1");
        expect(result.gtfsTrips[0]?.serviceId).toBe("BRS:S1");
        expect(result.gtfsStopTimes[0]?.stopId).toBe("BRP:P1");
        expect(result.gtfsCalendars[0]?.serviceId).toBe("BRS:S1");
    });

    it("generates stable transfer IDs", () => {
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

        expect(first.gtfsTransfers[0]?.id).toBe(second.gtfsTransfers[0]?.id);
    });

    it("normalizes undefined row values to empty strings in rawData", () => {
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

        expect(result.gtfsTrips[0]?.rawData.direction_id).toBe("");
    });
});
