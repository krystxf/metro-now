import {
    filterRailPlatforms,
    isRailRouteName,
    resolveMetroOnlyStopName,
    resolveRailStopName,
} from "src/modules/stop/stop-name.utils";
import type { StopPlatformRecord } from "src/modules/stop/stop.types";

const createPlatform = (
    overrides: Partial<StopPlatformRecord>,
): StopPlatformRecord => ({
    id: "P1",
    stopId: "S1",
    name: "Main stop",
    code: null,
    direction: null,
    isMetro: false,
    latitude: 50,
    longitude: 14,
    routes: [],
    ...overrides,
});

const makeRoute = (name: string) => ({
    id: `r-${name}`,
    name,
    color: null,
    feed: "PID" as never,
    vehicleType: null,
});

describe("stop-name.utils", () => {
    describe("isRailRouteName", () => {
        it("recognizes all four metro lines", () => {
            expect(isRailRouteName("A")).toBe(true);
            expect(isRailRouteName("B")).toBe(true);
            expect(isRailRouteName("C")).toBe(true);
            expect(isRailRouteName("D")).toBe(true);
        });

        it("recognizes train prefixes L, R, S, T, U, V", () => {
            expect(isRailRouteName("L1")).toBe(true);
            expect(isRailRouteName("R10")).toBe(true);
            expect(isRailRouteName("S9")).toBe(true);
            expect(isRailRouteName("T3")).toBe(true);
            expect(isRailRouteName("U7")).toBe(true);
            expect(isRailRouteName("V8")).toBe(true);
        });

        it("strips X prefix before matching metro lines and train prefixes", () => {
            expect(isRailRouteName("XA")).toBe(true);
            expect(isRailRouteName("XD")).toBe(true);
            expect(isRailRouteName("XS9")).toBe(true);
        });

        it("rejects bus and night bus routes", () => {
            expect(isRailRouteName("119")).toBe(false);
            expect(isRailRouteName("N91")).toBe(false);
            expect(isRailRouteName("200")).toBe(false);
        });

        it("rejects empty string", () => {
            expect(isRailRouteName("")).toBe(false);
        });
    });

    describe("resolveMetroOnlyStopName", () => {
        it("uses the single distinct platform name when available", () => {
            expect(
                resolveMetroOnlyStopName({
                    stopName: "Muzeum",
                    platforms: [{ name: "  Můstek  " }, { name: "Můstek" }],
                }),
            ).toBe("Můstek");
        });

        it("falls back to the stop name when multiple platform names exist", () => {
            expect(
                resolveMetroOnlyStopName({
                    stopName: "Muzeum",
                    platforms: [{ name: "A" }, { name: "B" }],
                }),
            ).toBe("Muzeum");
        });

        it("falls back to the stop name when there are no platforms", () => {
            expect(
                resolveMetroOnlyStopName({
                    stopName: "Muzeum",
                    platforms: [],
                }),
            ).toBe("Muzeum");
        });

        it("falls back to the stop name when all platform names are whitespace-only", () => {
            expect(
                resolveMetroOnlyStopName({
                    stopName: "Muzeum",
                    platforms: [{ name: "   " }, { name: "\t" }],
                }),
            ).toBe("Muzeum");
        });
    });

    describe("resolveRailStopName", () => {
        it("prefers a unique metro platform name", () => {
            expect(
                resolveRailStopName({
                    stopName: "Stop",
                    platforms: [
                        createPlatform({ isMetro: true, name: "Můstek" }),
                        createPlatform({
                            id: "P2",
                            isMetro: false,
                            name: "Praha",
                        }),
                    ],
                }),
            ).toBe("Můstek");
        });

        it("deduplicates metro platform names before deciding", () => {
            expect(
                resolveRailStopName({
                    stopName: "Stop",
                    platforms: [
                        createPlatform({
                            id: "P1",
                            isMetro: true,
                            name: "Můstek",
                        }),
                        createPlatform({
                            id: "P2",
                            isMetro: true,
                            name: "Můstek",
                        }),
                    ],
                }),
            ).toBe("Můstek");
        });

        it("falls back to a unique non-metro name when metro names are ambiguous", () => {
            expect(
                resolveRailStopName({
                    stopName: "Stop",
                    platforms: [
                        createPlatform({ isMetro: true, name: "A" }),
                        createPlatform({ id: "P2", isMetro: true, name: "B" }),
                        createPlatform({
                            id: "P3",
                            isMetro: false,
                            name: "Praha-Smíchov",
                        }),
                    ],
                }),
            ).toBe("Praha-Smíchov");
        });

        it("falls back to the stop name when no platforms are provided", () => {
            expect(
                resolveRailStopName({ stopName: "Stop", platforms: [] }),
            ).toBe("Stop");
        });

        it("falls back to the stop name when multiple non-metro platform names exist", () => {
            expect(
                resolveRailStopName({
                    stopName: "Stop",
                    platforms: [
                        createPlatform({
                            id: "P1",
                            isMetro: false,
                            name: "Praha hl.n.",
                        }),
                        createPlatform({
                            id: "P2",
                            isMetro: false,
                            name: "Praha Smíchov",
                        }),
                    ],
                }),
            ).toBe("Stop");
        });
    });

    describe("filterRailPlatforms", () => {
        it("returns empty array for empty input", () => {
            expect(filterRailPlatforms([])).toEqual([]);
        });

        it("drops non-rail non-metro platforms and keeps only rail routes", () => {
            const result = filterRailPlatforms([
                createPlatform({
                    id: "metro",
                    isMetro: true,
                    routes: [makeRoute("A")],
                }),
                createPlatform({
                    id: "train",
                    isMetro: false,
                    routes: [makeRoute("S9"), makeRoute("119")],
                }),
                createPlatform({
                    id: "bus",
                    isMetro: false,
                    routes: [makeRoute("119")],
                }),
            ]);

            expect(result).toEqual([
                createPlatform({
                    id: "metro",
                    isMetro: true,
                    routes: [makeRoute("A")],
                }),
                createPlatform({
                    id: "train",
                    isMetro: false,
                    routes: [makeRoute("S9")],
                }),
            ]);
        });

        it("keeps metro platforms even when they have no routes", () => {
            const result = filterRailPlatforms([
                createPlatform({ id: "metro", isMetro: true, routes: [] }),
            ]);

            expect(result).toEqual([
                createPlatform({ id: "metro", isMetro: true, routes: [] }),
            ]);
        });

        it("drops non-metro platforms with no routes", () => {
            const result = filterRailPlatforms([
                createPlatform({ id: "bus", isMetro: false, routes: [] }),
            ]);

            expect(result).toEqual([]);
        });

        it("drops all platforms when only bus routes exist", () => {
            const result = filterRailPlatforms([
                createPlatform({
                    id: "bus1",
                    isMetro: false,
                    routes: [makeRoute("119"), makeRoute("200")],
                }),
                createPlatform({
                    id: "bus2",
                    isMetro: false,
                    routes: [makeRoute("N91")],
                }),
            ]);

            expect(result).toEqual([]);
        });
    });
});
