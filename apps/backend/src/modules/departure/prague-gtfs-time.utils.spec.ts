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

        it("returns null for invalid GTFS time strings", () => {
            expect(parseGtfsTimeToSeconds("25:61:02")).toBeNull();
            expect(parseGtfsTimeToSeconds("invalid")).toBeNull();
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
    });

    describe("getWeekdayFromGtfsDate", () => {
        it("returns the GTFS weekday name", () => {
            expect(getWeekdayFromGtfsDate("20260118")).toBe("sunday");
            expect(getWeekdayFromGtfsDate("20260119")).toBe("monday");
        });

        it("throws for invalid GTFS dates", () => {
            expect(() => getWeekdayFromGtfsDate("2026-01-19")).toThrow(
                "Invalid GTFS date '2026-01-19'",
            );
        });
    });
});
