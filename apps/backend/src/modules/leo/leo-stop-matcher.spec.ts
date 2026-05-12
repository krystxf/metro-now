import {
    distanceInMeters,
    findMatchingLeoStop,
} from "./leo-stop-matcher.service";
import type { LeoStop } from "./leo.types";

const makeLeoStop = (
    overrides: Partial<LeoStop> & { id: string },
): LeoStop => ({
    gtfsStopId: overrides.id,
    name: "Stop",
    avgLatitude: 50.08,
    avgLongitude: 14.42,
    normalizedName: "stop",
    platforms: [],
    entrances: [],
    ...overrides,
});

describe("distanceInMeters", () => {
    it("returns 0 for identical points", () => {
        expect(distanceInMeters(50.08, 14.42, 50.08, 14.42)).toBe(0);
    });

    it("computes approximate distance between two Prague stops", () => {
        // Můstek (50.0831, 14.4250) -> Muzeum (50.0787, 14.4310)
        const distance = distanceInMeters(50.0831, 14.425, 50.0787, 14.431);

        expect(distance).toBeGreaterThan(500);
        expect(distance).toBeLessThan(700);
    });

    it("computes long distance (Prague -> Brno ~185km)", () => {
        const distance = distanceInMeters(50.0755, 14.4378, 49.1951, 16.6068);

        expect(distance).toBeGreaterThan(180_000);
        expect(distance).toBeLessThan(190_000);
    });

    it("is symmetric", () => {
        const d1 = distanceInMeters(50.08, 14.42, 49.19, 16.61);
        const d2 = distanceInMeters(49.19, 16.61, 50.08, 14.42);

        expect(d1).toBeCloseTo(d2, 6);
    });
});

describe("findMatchingLeoStop", () => {
    const localStop = {
        name: "Mustek",
        avgLatitude: 50.08,
        avgLongitude: 14.42,
    };

    it("returns undefined when leoStops is empty", () => {
        expect(findMatchingLeoStop(localStop, [])).toBeUndefined();
    });

    it("returns undefined when normalized name does not match", () => {
        const leoStop = makeLeoStop({
            id: "LEO1",
            normalizedName: "muzeum",
            avgLatitude: 50.08,
            avgLongitude: 14.42,
        });

        expect(findMatchingLeoStop(localStop, [leoStop])).toBeUndefined();
    });

    it("returns undefined when name matches but distance exceeds 250m", () => {
        // 0.003 degrees latitude ≈ 333m — outside the 250m threshold
        const leoStop = makeLeoStop({
            id: "LEO1",
            normalizedName: "mustek",
            avgLatitude: 50.083,
            avgLongitude: 14.42,
        });

        expect(findMatchingLeoStop(localStop, [leoStop])).toBeUndefined();
    });

    it("returns the stop when name matches and distance is within 250m", () => {
        // 0.002 degrees latitude ≈ 222m — within the 250m threshold
        const leoStop = makeLeoStop({
            id: "LEO1",
            normalizedName: "mustek",
            avgLatitude: 50.082,
            avgLongitude: 14.42,
        });

        expect(findMatchingLeoStop(localStop, [leoStop])).toBe(leoStop);
    });

    it("normalizes the local stop name so diacritics match the leo normalizedName", () => {
        const localStopWithDiacritics = {
            name: "Náměstí Míru",
            avgLatitude: 50.08,
            avgLongitude: 14.42,
        };
        const leoStop = makeLeoStop({
            id: "LEO1",
            normalizedName: "namesti miru",
            avgLatitude: 50.08,
            avgLongitude: 14.42,
        });

        expect(findMatchingLeoStop(localStopWithDiacritics, [leoStop])).toBe(
            leoStop,
        );
    });

    it("returns the closest stop when multiple candidates match by name and distance", () => {
        // close: ~111m away; closer: ~44m away
        const closer = makeLeoStop({
            id: "LEO-CLOSE",
            normalizedName: "mustek",
            avgLatitude: 50.0804,
            avgLongitude: 14.42,
        });
        const close = makeLeoStop({
            id: "LEO-FAR",
            normalizedName: "mustek",
            avgLatitude: 50.081,
            avgLongitude: 14.42,
        });

        expect(findMatchingLeoStop(localStop, [close, closer])).toBe(closer);
    });

    it("uses id as tiebreaker when two stops are at the same distance", () => {
        const stopA = makeLeoStop({
            id: "LEO-A",
            normalizedName: "mustek",
            avgLatitude: 50.081,
            avgLongitude: 14.42,
        });
        const stopB = makeLeoStop({
            id: "LEO-B",
            normalizedName: "mustek",
            avgLatitude: 50.081,
            avgLongitude: 14.42,
        });

        expect(findMatchingLeoStop(localStop, [stopB, stopA])).toBe(stopA);
    });

    it("ignores stops whose name matches but are too far even when closer stops are absent", () => {
        const near = makeLeoStop({
            id: "LEO-NEAR",
            normalizedName: "mustek",
            avgLatitude: 50.082,
            avgLongitude: 14.42,
        });
        const far = makeLeoStop({
            id: "LEO-FAR",
            normalizedName: "mustek",
            avgLatitude: 50.09,
            avgLongitude: 14.42,
        });

        expect(findMatchingLeoStop(localStop, [far, near])).toBe(near);
    });
});
