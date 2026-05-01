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

describe("stop-name.utils", () => {
    describe("isRailRouteName", () => {
        it("recognizes metro and train route names including X-prefixed variants", () => {
            expect(isRailRouteName("A")).toBe(true);
            expect(isRailRouteName("XS9")).toBe(true);
            expect(isRailRouteName("R10")).toBe(true);
            expect(isRailRouteName("119")).toBe(false);
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

        it("falls back to a unique non-metro rail name when metro names are ambiguous", () => {
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
    });

    describe("filterRailPlatforms", () => {
        it("drops non-rail non-metro platforms and keeps only rail routes", () => {
            const result = filterRailPlatforms([
                createPlatform({
                    id: "metro",
                    isMetro: true,
                    routes: [
                        {
                            id: "r1",
                            name: "A",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: null,
                        },
                    ],
                }),
                createPlatform({
                    id: "train",
                    isMetro: false,
                    routes: [
                        {
                            id: "r2",
                            name: "S9",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: null,
                        },
                        {
                            id: "r3",
                            name: "119",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: null,
                        },
                    ],
                }),
                createPlatform({
                    id: "bus",
                    isMetro: false,
                    routes: [
                        {
                            id: "r4",
                            name: "119",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: null,
                        },
                    ],
                }),
            ]);

            expect(result).toEqual([
                createPlatform({
                    id: "metro",
                    isMetro: true,
                    routes: [
                        {
                            id: "r1",
                            name: "A",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: null,
                        },
                    ],
                }),
                createPlatform({
                    id: "train",
                    isMetro: false,
                    routes: [
                        {
                            id: "r2",
                            name: "S9",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: null,
                        },
                    ],
                }),
            ]);
        });
    });
});
