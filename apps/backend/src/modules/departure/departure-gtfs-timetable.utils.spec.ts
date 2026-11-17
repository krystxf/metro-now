import type { DatabaseClient } from "@metro-now/database";
import {
    getActiveGtfsServiceIdsForDates,
    isMissingGtfsTimetableError,
    loadGtfsFirstStopTimeByTripKey,
    loadGtfsFrequenciesByTripKey,
} from "src/modules/departure/departure-gtfs-timetable.utils";

const makeQueryBuilder = (rows: unknown[]) => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(rows),
});

const makeDb = (tableResults: Record<string, unknown[]>) =>
    ({
        selectFrom: jest.fn((table: string) =>
            makeQueryBuilder(tableResults[table] ?? []),
        ),
    }) as unknown as DatabaseClient;

describe("isMissingGtfsTimetableError", () => {
    it("returns true for SQLSTATE 42P01 (undefined_table)", () => {
        expect(isMissingGtfsTimetableError({ code: "42P01" })).toBe(true);
    });

    it("returns true for SQLSTATE 42703 (undefined_column)", () => {
        expect(isMissingGtfsTimetableError({ code: "42703" })).toBe(true);
    });

    it("returns false for other error codes", () => {
        expect(isMissingGtfsTimetableError({ code: "23503" })).toBe(false);
    });

    it("returns false for null", () => {
        expect(isMissingGtfsTimetableError(null)).toBe(false);
    });

    it("returns false for non-object errors", () => {
        expect(isMissingGtfsTimetableError("table not found")).toBe(false);
    });

    it("returns false for objects without a code property", () => {
        expect(isMissingGtfsTimetableError({ message: "some error" })).toBe(
            false,
        );
    });
});

describe("getActiveGtfsServiceIdsForDates", () => {
    // 20240115 = Monday, 20240116 = Tuesday, 20240120 = Saturday, 20240121 = Sunday
    const MONDAY = "20240115";
    const TUESDAY = "20240116";

    const makeCalendar = (
        overrides: Partial<{
            feedId: string;
            serviceId: string;
            monday: boolean;
            tuesday: boolean;
            wednesday: boolean;
            thursday: boolean;
            friday: boolean;
            saturday: boolean;
            sunday: boolean;
            startDate: string | null;
            endDate: string | null;
        }> = {},
    ) => ({
        feedId: "ZSR",
        serviceId: "S1",
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
        startDate: "20240101",
        endDate: "20241231",
        ...overrides,
    });

    it("returns empty map when feedIds is empty", async () => {
        const db = makeDb({});
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: [],
            serviceDates: [MONDAY],
        });
        expect(result.size).toBe(0);
    });

    it("returns empty map when serviceDates is empty", async () => {
        const db = makeDb({});
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR"],
            serviceDates: [],
        });
        expect(result.size).toBe(0);
    });

    it("initialises all feedId::date keys with empty sets before filling", async () => {
        const db = makeDb({ GtfsCalendar: [], GtfsCalendarDate: [] });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR", "LEO"],
            serviceDates: [MONDAY, TUESDAY],
        });
        expect(result.size).toBe(4);
        expect(result.get(`ZSR::${MONDAY}`)).toEqual(new Set());
        expect(result.get(`ZSR::${TUESDAY}`)).toEqual(new Set());
        expect(result.get(`LEO::${MONDAY}`)).toEqual(new Set());
        expect(result.get(`LEO::${TUESDAY}`)).toEqual(new Set());
    });

    it("adds service for a calendar entry on a matching weekday", async () => {
        const db = makeDb({
            GtfsCalendar: [makeCalendar({ monday: true })],
            GtfsCalendarDate: [],
        });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR"],
            serviceDates: [MONDAY],
        });
        expect(result.get(`ZSR::${MONDAY}`)).toEqual(new Set(["S1"]));
    });

    it("does not add service when the weekday flag does not match", async () => {
        const db = makeDb({
            GtfsCalendar: [makeCalendar({ monday: true })],
            GtfsCalendarDate: [],
        });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR"],
            serviceDates: [TUESDAY],
        });
        expect(result.get(`ZSR::${TUESDAY}`)).toEqual(new Set());
    });

    it("does not add service when the service date is before calendar startDate", async () => {
        const db = makeDb({
            GtfsCalendar: [
                makeCalendar({ monday: true, startDate: "20240201" }),
            ],
            GtfsCalendarDate: [],
        });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR"],
            serviceDates: [MONDAY],
        });
        expect(result.get(`ZSR::${MONDAY}`)).toEqual(new Set());
    });

    it("does not add service when the service date is after calendar endDate", async () => {
        const db = makeDb({
            GtfsCalendar: [makeCalendar({ monday: true, endDate: "20240110" })],
            GtfsCalendarDate: [],
        });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR"],
            serviceDates: [MONDAY],
        });
        expect(result.get(`ZSR::${MONDAY}`)).toEqual(new Set());
    });

    it("applies no date-range restriction when startDate is null", async () => {
        const db = makeDb({
            GtfsCalendar: [
                makeCalendar({
                    monday: true,
                    startDate: null,
                    endDate: "20241231",
                }),
            ],
            GtfsCalendarDate: [],
        });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR"],
            serviceDates: [MONDAY],
        });
        expect(result.get(`ZSR::${MONDAY}`)).toEqual(new Set(["S1"]));
    });

    it("applies no date-range restriction when endDate is null", async () => {
        const db = makeDb({
            GtfsCalendar: [
                makeCalendar({
                    monday: true,
                    startDate: "20240101",
                    endDate: null,
                }),
            ],
            GtfsCalendarDate: [],
        });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR"],
            serviceDates: [MONDAY],
        });
        expect(result.get(`ZSR::${MONDAY}`)).toEqual(new Set(["S1"]));
    });

    it("adds service via calendarDate exceptionType 1 even without a calendar entry", async () => {
        const db = makeDb({
            GtfsCalendar: [],
            GtfsCalendarDate: [
                {
                    feedId: "ZSR",
                    serviceId: "S1",
                    date: MONDAY,
                    exceptionType: 1,
                },
            ],
        });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR"],
            serviceDates: [MONDAY],
        });
        expect(result.get(`ZSR::${MONDAY}`)).toEqual(new Set(["S1"]));
    });

    it("removes service via calendarDate exceptionType 2", async () => {
        const db = makeDb({
            GtfsCalendar: [makeCalendar({ monday: true })],
            GtfsCalendarDate: [
                {
                    feedId: "ZSR",
                    serviceId: "S1",
                    date: MONDAY,
                    exceptionType: 2,
                },
            ],
        });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR"],
            serviceDates: [MONDAY],
        });
        expect(result.get(`ZSR::${MONDAY}`)).toEqual(new Set());
    });

    it("does not affect services from other feedIds", async () => {
        const db = makeDb({
            GtfsCalendar: [makeCalendar({ monday: true, feedId: "ZSR" })],
            GtfsCalendarDate: [],
        });
        const result = await getActiveGtfsServiceIdsForDates(db, {
            feedIds: ["ZSR", "LEO"],
            serviceDates: [MONDAY],
        });
        expect(result.get(`ZSR::${MONDAY}`)).toEqual(new Set(["S1"]));
        expect(result.get(`LEO::${MONDAY}`)).toEqual(new Set());
    });
});

describe("loadGtfsFrequenciesByTripKey", () => {
    it("returns empty map for empty tripKeys", async () => {
        const db = makeDb({});
        const result = await loadGtfsFrequenciesByTripKey(db, {
            feedIds: ["ZSR"],
            tripKeys: [],
        });
        expect(result.size).toBe(0);
    });

    it("returns empty map for empty feedIds", async () => {
        const db = makeDb({});
        const result = await loadGtfsFrequenciesByTripKey(db, {
            feedIds: [],
            tripKeys: ["ZSR::trip-1"],
        });
        expect(result.size).toBe(0);
    });

    it("groups multiple frequency rows by trip key", async () => {
        const db = makeDb({
            GtfsFrequency: [
                {
                    feedId: "ZSR",
                    tripId: "trip-1",
                    startTime: "06:00:00",
                    endTime: "09:00:00",
                    headwaySecs: 900,
                },
                {
                    feedId: "ZSR",
                    tripId: "trip-1",
                    startTime: "15:00:00",
                    endTime: "20:00:00",
                    headwaySecs: 1200,
                },
                {
                    feedId: "ZSR",
                    tripId: "trip-2",
                    startTime: "07:00:00",
                    endTime: "10:00:00",
                    headwaySecs: 600,
                },
            ],
        });
        const result = await loadGtfsFrequenciesByTripKey(db, {
            feedIds: ["ZSR"],
            tripKeys: ["ZSR::trip-1", "ZSR::trip-2"],
        });
        expect(result.get("ZSR::trip-1")).toHaveLength(2);
        expect(result.get("ZSR::trip-1")).toEqual(
            expect.arrayContaining([
                {
                    startTime: "06:00:00",
                    endTime: "09:00:00",
                    headwaySecs: 900,
                },
                {
                    startTime: "15:00:00",
                    endTime: "20:00:00",
                    headwaySecs: 1200,
                },
            ]),
        );
        expect(result.get("ZSR::trip-2")).toHaveLength(1);
    });

    it("filters out rows whose trip key is not in the requested set", async () => {
        const db = makeDb({
            GtfsFrequency: [
                {
                    feedId: "ZSR",
                    tripId: "trip-1",
                    startTime: "06:00:00",
                    endTime: "09:00:00",
                    headwaySecs: 900,
                },
                {
                    feedId: "ZSR",
                    tripId: "trip-2",
                    startTime: "07:00:00",
                    endTime: "10:00:00",
                    headwaySecs: 600,
                },
            ],
        });
        const result = await loadGtfsFrequenciesByTripKey(db, {
            feedIds: ["ZSR"],
            tripKeys: ["ZSR::trip-1"],
        });
        expect(result.has("ZSR::trip-1")).toBe(true);
        expect(result.has("ZSR::trip-2")).toBe(false);
    });
});

describe("loadGtfsFirstStopTimeByTripKey", () => {
    it("returns empty map for empty tripKeys", async () => {
        const db = makeDb({});
        const result = await loadGtfsFirstStopTimeByTripKey(db, {
            feedIds: ["ZSR"],
            tripKeys: [],
        });
        expect(result.size).toBe(0);
    });

    it("returns empty map for empty feedIds", async () => {
        const db = makeDb({});
        const result = await loadGtfsFirstStopTimeByTripKey(db, {
            feedIds: [],
            tripKeys: ["ZSR::trip-1"],
        });
        expect(result.size).toBe(0);
    });

    it("returns departure time in seconds for the stop with the lowest sequence number", async () => {
        const db = makeDb({
            GtfsStopTime: [
                {
                    feedId: "ZSR",
                    tripId: "trip-1",
                    stopSequence: 3,
                    departureTime: "08:00:00",
                    arrivalTime: "07:59:00",
                },
                {
                    feedId: "ZSR",
                    tripId: "trip-1",
                    stopSequence: 1,
                    departureTime: "07:00:00",
                    arrivalTime: "06:59:00",
                },
                {
                    feedId: "ZSR",
                    tripId: "trip-1",
                    stopSequence: 2,
                    departureTime: "07:30:00",
                    arrivalTime: "07:29:00",
                },
            ],
        });
        const result = await loadGtfsFirstStopTimeByTripKey(db, {
            feedIds: ["ZSR"],
            tripKeys: ["ZSR::trip-1"],
        });
        expect(result.get("ZSR::trip-1")).toBe(7 * 3600); // 07:00:00
    });

    it("falls back to arrivalTime when departureTime is null", async () => {
        const db = makeDb({
            GtfsStopTime: [
                {
                    feedId: "ZSR",
                    tripId: "trip-1",
                    stopSequence: 1,
                    departureTime: null,
                    arrivalTime: "07:00:00",
                },
            ],
        });
        const result = await loadGtfsFirstStopTimeByTripKey(db, {
            feedIds: ["ZSR"],
            tripKeys: ["ZSR::trip-1"],
        });
        expect(result.get("ZSR::trip-1")).toBe(7 * 3600);
    });

    it("handles multiple trips independently", async () => {
        const db = makeDb({
            GtfsStopTime: [
                {
                    feedId: "ZSR",
                    tripId: "trip-1",
                    stopSequence: 1,
                    departureTime: "07:00:00",
                    arrivalTime: null,
                },
                {
                    feedId: "ZSR",
                    tripId: "trip-2",
                    stopSequence: 1,
                    departureTime: "08:30:00",
                    arrivalTime: null,
                },
            ],
        });
        const result = await loadGtfsFirstStopTimeByTripKey(db, {
            feedIds: ["ZSR"],
            tripKeys: ["ZSR::trip-1", "ZSR::trip-2"],
        });
        expect(result.get("ZSR::trip-1")).toBe(7 * 3600);
        expect(result.get("ZSR::trip-2")).toBe(8 * 3600 + 30 * 60);
    });

    it("filters out rows whose trip key is not in the requested set", async () => {
        const db = makeDb({
            GtfsStopTime: [
                {
                    feedId: "ZSR",
                    tripId: "trip-1",
                    stopSequence: 1,
                    departureTime: "07:00:00",
                    arrivalTime: null,
                },
                {
                    feedId: "ZSR",
                    tripId: "trip-2",
                    stopSequence: 1,
                    departureTime: "08:00:00",
                    arrivalTime: null,
                },
            ],
        });
        const result = await loadGtfsFirstStopTimeByTripKey(db, {
            feedIds: ["ZSR"],
            tripKeys: ["ZSR::trip-1"],
        });
        expect(result.has("ZSR::trip-1")).toBe(true);
        expect(result.has("ZSR::trip-2")).toBe(false);
    });
});
