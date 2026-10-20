import type { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import {
    LeoStopMatcherService,
    distanceInMeters,
    findMatchingLeoStop,
} from "src/modules/leo/leo-stop-matcher.service";
import type { LeoStop } from "src/modules/leo/leo.types";

const leoStop = (
    id: string,
    name: string,
    avgLatitude: number,
    avgLongitude: number,
    normalizedName: string,
): LeoStop => ({
    id,
    gtfsStopId: id,
    name,
    avgLatitude,
    avgLongitude,
    normalizedName,
    platforms: [],
    entrances: [],
});

const createService = (leoStops: LeoStop[]) => {
    const leoGtfsService = {
        getStops: jest.fn(async () => leoStops),
    } as unknown as LeoGtfsService;
    const service = new LeoStopMatcherService(leoGtfsService);
    return { service, leoGtfsService };
};

describe("LeoStopMatcherService", () => {
    describe("distanceInMeters", () => {
        it("is zero for identical coordinates", () => {
            expect(distanceInMeters(48.15, 17.11, 48.15, 17.11)).toBe(0);
        });

        it("matches roughly 111 km for a 1-degree latitude difference", () => {
            const result = distanceInMeters(48, 17, 49, 17);
            expect(result).toBeGreaterThan(110_000);
            expect(result).toBeLessThan(112_000);
        });
    });

    describe("findMatchingLeoStop", () => {
        it("returns undefined when no leo stop has the same normalized name", () => {
            const result = findMatchingLeoStop(
                { name: "Hlavná stanica", avgLatitude: 48.15, avgLongitude: 17.11 },
                [leoStop("L1", "Predmestie", 48.15, 17.11, "predmestie")],
            );
            expect(result).toBeUndefined();
        });

        it("returns undefined when the matching name is farther than 250m", () => {
            const result = findMatchingLeoStop(
                {
                    name: "Hlavná stanica",
                    avgLatitude: 48.15,
                    avgLongitude: 17.11,
                },
                [
                    leoStop(
                        "L1",
                        "Hlavná stanica",
                        48.16,
                        17.12,
                        "hlavna stanica",
                    ),
                ],
            );
            expect(result).toBeUndefined();
        });

        it("returns the nearest matching leo stop within 250m", () => {
            const result = findMatchingLeoStop(
                {
                    name: "Hlavná stanica",
                    avgLatitude: 48.15,
                    avgLongitude: 17.11,
                },
                [
                    leoStop(
                        "far",
                        "Hlavná stanica",
                        48.1502,
                        17.1115,
                        "hlavna stanica",
                    ),
                    leoStop(
                        "near",
                        "Hlavná stanica",
                        48.15005,
                        17.11005,
                        "hlavna stanica",
                    ),
                ],
            );
            expect(result?.id).toBe("near");
        });

        it("breaks distance ties with lexicographic id ordering", () => {
            const result = findMatchingLeoStop(
                {
                    name: "Hlavná stanica",
                    avgLatitude: 48.15,
                    avgLongitude: 17.11,
                },
                [
                    leoStop(
                        "L_b",
                        "Hlavná stanica",
                        48.15,
                        17.11,
                        "hlavna stanica",
                    ),
                    leoStop(
                        "L_a",
                        "Hlavná stanica",
                        48.15,
                        17.11,
                        "hlavna stanica",
                    ),
                ],
            );
            expect(result?.id).toBe("L_a");
        });
    });

    describe("getMatchedLeoStopByLocalStopId", () => {
        it("maps each matched local stop id to its leo stop id", async () => {
            const { service } = createService([
                leoStop("L1", "Hlavná stanica", 48.15, 17.11, "hlavna stanica"),
            ]);

            const result = await service.getMatchedLeoStopByLocalStopId([
                {
                    id: "local-1",
                    name: "Hlavná stanica",
                    avgLatitude: 48.15,
                    avgLongitude: 17.11,
                },
                {
                    id: "local-2",
                    name: "Nezhodna",
                    avgLatitude: 48.15,
                    avgLongitude: 17.11,
                },
            ]);

            expect(Object.fromEntries(result)).toEqual({ "local-1": "L1" });
        });
    });

    describe("getUnmatchedLeoStopIds", () => {
        it("returns every leo stop that has no local match", async () => {
            const { service } = createService([
                leoStop("L1", "Hlavná stanica", 48.15, 17.11, "hlavna stanica"),
                leoStop("L2", "Predmestie", 48.16, 17.12, "predmestie"),
            ]);

            const result = await service.getUnmatchedLeoStopIds([
                {
                    id: "local-1",
                    name: "Hlavná stanica",
                    avgLatitude: 48.15,
                    avgLongitude: 17.11,
                },
            ]);

            expect([...result].sort()).toEqual(["L2"]);
        });
    });
});
