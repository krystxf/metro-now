import {
    type GtfsDepartureRow,
    type GtfsFrequency,
    buildGtfsFallbackDepartures,
} from "src/modules/departure/departure-gtfs-fallback.utils";

// Jan 15 2024 is a Monday. Prague is CET (UTC+1) in January.
// 08:00 Prague = 07:00 UTC → timeSeconds = 28800
// 09:00 Prague = 08:00 UTC → timeSeconds = 32400
// 10:00 Prague = 09:00 UTC → timeSeconds = 36000
const DATE = "20240115";
const FEED_ID = "ZSR";
const SERVICE_ID = "svc1";

const makeRow = (
    overrides: Partial<GtfsDepartureRow> = {},
): GtfsDepartureRow => ({
    stopTimeId: "st1",
    feedId: FEED_ID,
    tripId: "trip1",
    platformId: "platform1",
    arrivalTime: null,
    departureTime: "08:00:00",
    serviceId: SERVICE_ID,
    routeId: "route1",
    tripHeadsign: "Central Station",
    routeShortName: "R1",
    routeLongName: "Regional 1",
    platformCode: "A",
    ...overrides,
});

const makeActiveServiceIds = (
    feedId: string,
    date: string,
    serviceIds: string[],
): Map<string, Set<string>> => {
    const map = new Map<string, Set<string>>();
    map.set(`${feedId}::${date}`, new Set(serviceIds));
    return map;
};

// 07:00 UTC = 08:00 CET (Prague, winter)
const WINDOW_START = new Date("2024-01-15T06:30:00.000Z"); // 07:30 CET
const WINDOW_END = new Date("2024-01-15T09:30:00.000Z"); // 10:30 CET

const BASE_ARGS = {
    rows: [] as GtfsDepartureRow[],
    frequenciesByTripKey: new Map<string, GtfsFrequency[]>(),
    firstStopTimeByTripKey: new Map<string, number>(),
    activeServiceIdsByFeedDate: new Map<string, Set<string>>(),
    serviceDates: [DATE],
    windowStart: WINDOW_START,
    windowEnd: WINDOW_END,
    totalLimit: 100,
};

describe("buildGtfsFallbackDepartures", () => {
    describe("row filtering", () => {
        it("returns empty array for no rows", () => {
            expect(
                buildGtfsFallbackDepartures({ ...BASE_ARGS, rows: [] }),
            ).toEqual([]);
        });

        it("skips rows with null platformId", () => {
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ platformId: null })],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toEqual([]);
        });

        it("skips rows with null serviceId", () => {
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ serviceId: null })],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toEqual([]);
        });

        it("skips rows with null departureTime and null arrivalTime", () => {
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ departureTime: null, arrivalTime: null })],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toEqual([]);
        });

        it("uses arrivalTime as fallback when departureTime is null", () => {
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [
                    makeRow({ departureTime: null, arrivalTime: "08:00:00" }),
                ],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toHaveLength(1);
        });

        it("skips rows whose serviceId is not in active services for the date", () => {
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow()],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    ["other-service"],
                ),
            });
            expect(result).toEqual([]);
        });
    });

    describe("window filtering", () => {
        it("includes departure within the time window", () => {
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ departureTime: "08:00:00" })],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toHaveLength(1);
        });

        it("excludes departure before windowStart", () => {
            // 06:00 Prague = 05:00 UTC, outside window which starts at 06:30 UTC
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ departureTime: "06:00:00" })],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toEqual([]);
        });

        it("excludes departure after windowEnd", () => {
            // 11:00 Prague = 10:00 UTC, outside window which ends at 09:30 UTC
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ departureTime: "11:00:00" })],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toEqual([]);
        });
    });

    describe("explicit (non-frequency) departures", () => {
        it("builds a departure with the correct shape", () => {
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow()],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toHaveLength(1);
            const dep = result[0];
            expect(dep.id).toBe(`st1::${DATE}::explicit`);
            expect(dep.route).toBe("R1");
            expect(dep.routeId).toBe("route1");
            expect(dep.platformId).toBe("platform1");
            expect(dep.platformCode).toBe("A");
            expect(dep.headsign).toBe("Central Station");
            expect(dep.delay).toBe(0);
            expect(dep.isRealtime).toBe(false);
            expect(dep.departure.predicted).toBe(dep.departure.scheduled);
        });

        it("falls back to routeLongName when tripHeadsign is null", () => {
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ tripHeadsign: null })],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result[0].headsign).toBe("Regional 1");
        });

        it("falls back to routeShortName when both headsign and longName are null", () => {
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ tripHeadsign: null, routeLongName: null })],
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result[0].headsign).toBe("R1");
        });

        it("generates one departure per active service date", () => {
            const activeMap = new Map<string, Set<string>>();
            activeMap.set(`${FEED_ID}::20240115`, new Set([SERVICE_ID]));
            activeMap.set(`${FEED_ID}::20240116`, new Set([SERVICE_ID]));
            // Window spans both Jan 15 and Jan 16 to capture both departures
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow()],
                activeServiceIdsByFeedDate: activeMap,
                serviceDates: ["20240115", "20240116"],
                windowStart: new Date("2024-01-15T06:30:00.000Z"),
                windowEnd: new Date("2024-01-16T09:30:00.000Z"),
            });
            expect(result).toHaveLength(2);
        });
    });

    describe("frequency-based departures", () => {
        it("generates multiple departures from a single frequency window", () => {
            // frequency: 08:00→09:00, every 20 min → trips at 08:00, 08:20, 08:40
            // stop is 0 min offset from trip start
            const frequenciesByTripKey = new Map<string, GtfsFrequency[]>();
            frequenciesByTripKey.set(`${FEED_ID}::trip1`, [
                {
                    startTime: "08:00:00",
                    endTime: "09:00:00",
                    headwaySecs: 1200,
                },
            ]);
            const firstStopTimeByTripKey = new Map<string, number>();
            firstStopTimeByTripKey.set(`${FEED_ID}::trip1`, 28800); // 08:00:00

            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ departureTime: "08:00:00" })],
                frequenciesByTripKey,
                firstStopTimeByTripKey,
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            // trips at 08:00, 08:20, 08:40 — all within window (06:30–09:30 UTC = 07:30–10:30 CET)
            expect(result).toHaveLength(3);
        });

        it("applies stop offset from trip start for mid-trip stops", () => {
            // frequency: 08:00→09:00, every 30 min → trips at 08:00, 08:30
            // stop is 5 min (300s) into the trip → departures at 08:05, 08:35
            const frequenciesByTripKey = new Map<string, GtfsFrequency[]>();
            frequenciesByTripKey.set(`${FEED_ID}::trip1`, [
                {
                    startTime: "08:00:00",
                    endTime: "09:00:00",
                    headwaySecs: 1800,
                },
            ]);
            const firstStopTimeByTripKey = new Map<string, number>();
            firstStopTimeByTripKey.set(`${FEED_ID}::trip1`, 28800); // 08:00:00

            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow({ departureTime: "08:05:00" })], // 5 min offset
                frequenciesByTripKey,
                firstStopTimeByTripKey,
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toHaveLength(2);
            // check first departure is at 08:05 CET = 07:05 UTC
            expect(result[0].departure.predicted).toBe(
                "2024-01-15T07:05:00.000Z",
            );
            // check second departure is at 08:35 CET = 07:35 UTC
            expect(result[1].departure.predicted).toBe(
                "2024-01-15T07:35:00.000Z",
            );
        });

        it("skips frequency entries with headwaySecs <= 0", () => {
            const frequenciesByTripKey = new Map<string, GtfsFrequency[]>();
            frequenciesByTripKey.set(`${FEED_ID}::trip1`, [
                { startTime: "08:00:00", endTime: "09:00:00", headwaySecs: 0 },
            ]);
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow()],
                frequenciesByTripKey,
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toEqual([]);
        });

        it("uses frequency-based id suffix including startTime and tripStartSeconds", () => {
            const frequenciesByTripKey = new Map<string, GtfsFrequency[]>();
            frequenciesByTripKey.set(`${FEED_ID}::trip1`, [
                {
                    startTime: "08:00:00",
                    endTime: "08:30:00",
                    headwaySecs: 1800,
                },
            ]);
            const firstStopTimeByTripKey = new Map<string, number>();
            firstStopTimeByTripKey.set(`${FEED_ID}::trip1`, 28800);

            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [makeRow()],
                frequenciesByTripKey,
                firstStopTimeByTripKey,
                activeServiceIdsByFeedDate: makeActiveServiceIds(
                    FEED_ID,
                    DATE,
                    [SERVICE_ID],
                ),
            });
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(`st1::${DATE}::freq::08:00:00::28800`);
        });
    });

    describe("sorting and limiting", () => {
        it("sorts departures by predicted time ascending", () => {
            const activeMap = makeActiveServiceIds(FEED_ID, DATE, [SERVICE_ID]);
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: [
                    makeRow({ stopTimeId: "st2", departureTime: "09:00:00" }),
                    makeRow({ stopTimeId: "st1", departureTime: "08:00:00" }),
                ],
                activeServiceIdsByFeedDate: activeMap,
            });
            expect(result[0].id).toBe(`st1::${DATE}::explicit`);
            expect(result[1].id).toBe(`st2::${DATE}::explicit`);
        });

        it("limits results to totalLimit", () => {
            const activeMap = makeActiveServiceIds(FEED_ID, DATE, [SERVICE_ID]);
            const rows = Array.from({ length: 10 }, (_, i) =>
                makeRow({
                    stopTimeId: `st${i}`,
                    departureTime: `0${8 + i}:00:00`,
                }),
            );
            const result = buildGtfsFallbackDepartures({
                ...BASE_ARGS,
                rows: rows.slice(0, 5),
                activeServiceIdsByFeedDate: activeMap,
                totalLimit: 3,
            });
            expect(result).toHaveLength(3);
        });
    });
});
