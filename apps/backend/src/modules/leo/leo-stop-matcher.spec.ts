import { distanceInMeters } from "./leo-stop-matcher.service";

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
