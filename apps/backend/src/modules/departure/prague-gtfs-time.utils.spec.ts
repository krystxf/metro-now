import {
    getGtfsServiceDatesForWindow,
    getWeekdayFromGtfsDate,
    parseGtfsTimeToSeconds,
    toPragueDateFromGtfs,
} from "src/modules/departure/prague-gtfs-time.utils";

describe("prague-gtfs-time.utils", () => {
    describe("parseGtfsTimeToSeconds", () => {
        it("parses valid GTFS time strings", () => {
            expect(parseGtfsTimeToSeconds("25:01:02")).toBe(90_062);
        });

        it("parses midnight (00:00:00) as zero seconds", () => {
            expect(parseGtfsTimeToSeconds("00:00:00")).toBe(0);
        });

        it("trims leading and trailing whitespace before parsing", () => {
            expect(parseGtfsTimeToSeconds(" 01:02:03 ")).toBe(3_723);
        });

        it("returns null for invalid GTFS time strings", () => {
            expect(parseGtfsTimeToSeconds("25:61:02")).toBeNull();
            expect(parseGtfsTimeToSeconds("invalid")).toBeNull();
            expect(parseGtfsTimeToSeconds("12:30")).toBeNull();
        });
    });

    describe("toPragueDateFromGtfs", () => {
        it("converts winter Prague local time to UTC correctly", () => {
            expect(
                toPragueDateFromGtfs({
                    gtfsDate: "20260115",
                    timeSeconds: 3_723,
                }).toISOString(),
            ).toBe("2026-01-15T00:02:03.000Z");
        });

        it("converts summer Prague local time to UTC correctly", () => {
            expect(
                toPragueDateFromGtfs({
                    gtfsDate: "20260715",
                    timeSeconds: 3_723,
                }).toISOString(),
            ).toBe("2026-07-14T23:02:03.000Z");
        });

        it("handles GTFS times beyond 24 hours", () => {
            expect(
                toPragueDateFromGtfs({
                    gtfsDate: "20260115",
                    timeSeconds: 25 * 3_600 + 30 * 60,
                }).toISOString(),
            ).toBe("2026-01-16T00:30:00.000Z");
        });

        it("converts midnight (00:00:00) to the correct UTC timestamp", () => {
            // Prague winter time is UTC+1, so midnight Prague = 23:00:00 UTC previous day
            expect(
                toPragueDateFromGtfs({
                    gtfsDate: "20260115",
                    timeSeconds: 0,
                }).toISOString(),
            ).toBe("2026-01-14T23:00:00.000Z");
        });
    });

    describe("getGtfsServiceDatesForWindow", () => {
        it("includes the Prague-local day before and after the window", () => {
            expect(
                getGtfsServiceDatesForWindow({
                    start: new Date("2026-01-15T10:00:00.000Z"),
                    end: new Date("2026-01-16T10:00:00.000Z"),
                }),
            ).toEqual(["20260114", "20260115", "20260116", "20260117"]);
        });

        it("returns exactly 3 dates for a window contained within a single Prague day", () => {
            // Both start and end fall on Jan 15 in Prague (CET=UTC+1): 11:00–15:00 local
            expect(
                getGtfsServiceDatesForWindow({
                    start: new Date("2026-01-15T10:00:00.000Z"),
                    end: new Date("2026-01-15T14:00:00.000Z"),
                }),
            ).toEqual(["20260114", "20260115", "20260116"]);
        });
    });

    describe("getWeekdayFromGtfsDate", () => {
        it("returns the GTFS weekday name", () => {
            expect(getWeekdayFromGtfsDate("20260118")).toBe("sunday");
            expect(getWeekdayFromGtfsDate("20260119")).toBe("monday");
        });

        it("returns correct weekday for Tuesday through Saturday", () => {
            expect(getWeekdayFromGtfsDate("20260120")).toBe("tuesday");
            expect(getWeekdayFromGtfsDate("20260121")).toBe("wednesday");
            expect(getWeekdayFromGtfsDate("20260122")).toBe("thursday");
            expect(getWeekdayFromGtfsDate("20260123")).toBe("friday");
            expect(getWeekdayFromGtfsDate("20260124")).toBe("saturday");
        });

        it("throws for invalid GTFS dates", () => {
            expect(() => getWeekdayFromGtfsDate("2026-01-19")).toThrow(
                "Invalid GTFS date '2026-01-19'",
            );
        });
    });
});
