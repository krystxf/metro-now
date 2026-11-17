import { GtfsFeedId } from "@metro-now/database";

import type { LeoRoute } from "src/modules/leo/leo.types";
import {
    type RouteExactShapeRow,
    type RouteRow,
    type RouteStopRow,
    leoRouteToGraphQLRecord,
    processRoute,
} from "src/modules/route/route-graphql.utils";

const makeRoute = (overrides: Partial<RouteRow> = {}): RouteRow => ({
    id: "L991",
    feedId: GtfsFeedId.PID,
    shortName: "A",
    longName: "Metro A",
    isNight: false,
    color: "#00A650",
    url: null,
    type: "subway",
    vehicleType: null,
    ...overrides,
});

const makeRouteStop = (
    overrides: Partial<RouteStopRow> = {},
): RouteStopRow => ({
    routeId: "L991",
    directionId: "0",
    stopSequence: 1,
    platform: {
        id: "P1",
        latitude: 50.1,
        longitude: 14.4,
        name: "Platform 1",
        isMetro: true,
        code: "A",
    },
    ...overrides,
});

const makeShape = (
    overrides: Partial<RouteExactShapeRow> = {},
): RouteExactShapeRow => ({
    routeId: "L991",
    directionId: "0",
    shapeId: "shape-1",
    tripCount: 10,
    geoJson: {
        type: "LineString",
        coordinates: [
            [14.4, 50.1],
            [14.5, 50.2],
        ],
    },
    ...overrides,
});

describe("processRoute", () => {
    describe("id transformation", () => {
        it("strips the L prefix from route id", () => {
            const result = processRoute(makeRoute({ id: "L991" }), [], []);
            expect(result.id).toBe("991");
        });

        it("preserves colon-separated ids without modification", () => {
            const result = processRoute(makeRoute({ id: "LTL:123" }), [], []);
            expect(result.id).toBe("LTL:123");
        });

        it("preserves ids that have colons but no L prefix", () => {
            const result = processRoute(
                makeRoute({ id: "PID:route:1" }),
                [],
                [],
            );
            expect(result.id).toBe("PID:route:1");
        });
    });

    describe("basic field mapping", () => {
        it("sets name from shortName", () => {
            const result = processRoute(makeRoute({ shortName: "22" }), [], []);
            expect(result.name).toBe("22");
        });

        it("sets feed from feedId", () => {
            const result = processRoute(
                makeRoute({ feedId: GtfsFeedId.BRNO }),
                [],
                [],
            );
            expect(result.feed).toBe(GtfsFeedId.BRNO);
        });

        it("defaults isNight to false when null", () => {
            const result = processRoute(makeRoute({ isNight: null }), [], []);
            expect(result.isNight).toBe(false);
        });

        it("preserves isNight true", () => {
            const result = processRoute(makeRoute({ isNight: true }), [], []);
            expect(result.isNight).toBe(true);
        });

        it("preserves color, url, type, and vehicleType", () => {
            const result = processRoute(
                makeRoute({
                    color: "#ff0000",
                    url: "https://example.com",
                    type: "bus",
                    vehicleType: "BUS",
                }),
                [],
                [],
            );
            expect(result.color).toBe("#ff0000");
            expect(result.url).toBe("https://example.com");
            expect(result.type).toBe("bus");
            expect(result.vehicleType).toBe("BUS");
        });
    });

    describe("directions", () => {
        it("returns empty directions for no route stops", () => {
            const result = processRoute(makeRoute(), [], []);
            expect(result.directions).toHaveLength(0);
        });

        it("groups stops by directionId", () => {
            const stops = [
                makeRouteStop({ directionId: "0", stopSequence: 1 }),
                makeRouteStop({ directionId: "1", stopSequence: 1 }),
            ];
            const result = processRoute(makeRoute(), stops, []);
            const directionIds = result.directions.map((d) => d.id).sort();
            expect(directionIds).toEqual(["0", "1"]);
        });

        it("sorts platforms within a direction by stopSequence", () => {
            const stops = [
                makeRouteStop({
                    directionId: "0",
                    stopSequence: 3,
                    platform: {
                        id: "P3",
                        latitude: 50.3,
                        longitude: 14.6,
                        name: "Platform 3",
                        isMetro: true,
                        code: null,
                    },
                }),
                makeRouteStop({
                    directionId: "0",
                    stopSequence: 1,
                    platform: {
                        id: "P1",
                        latitude: 50.1,
                        longitude: 14.4,
                        name: "Platform 1",
                        isMetro: true,
                        code: null,
                    },
                }),
                makeRouteStop({
                    directionId: "0",
                    stopSequence: 2,
                    platform: {
                        id: "P2",
                        latitude: 50.2,
                        longitude: 14.5,
                        name: "Platform 2",
                        isMetro: true,
                        code: null,
                    },
                }),
            ];
            const result = processRoute(makeRoute(), stops, []);
            const dir = result.directions.find((d) => d.id === "0");
            expect(dir?.platforms.map((p) => p.id)).toEqual(["P1", "P2", "P3"]);
        });

        it("filters out null platforms", () => {
            const stops = [
                makeRouteStop({ directionId: "0", platform: null }),
                makeRouteStop({
                    directionId: "0",
                    stopSequence: 2,
                    platform: {
                        id: "P2",
                        latitude: 50.2,
                        longitude: 14.5,
                        name: "Platform 2",
                        isMetro: true,
                        code: null,
                    },
                }),
            ];
            const result = processRoute(makeRoute(), stops, []);
            const dir = result.directions.find((d) => d.id === "0");
            expect(dir?.platforms).toHaveLength(1);
            expect(dir?.platforms[0].id).toBe("P2");
        });
    });

    describe("shapes", () => {
        it("returns empty shapes for no route exact shapes", () => {
            const result = processRoute(makeRoute(), [], []);
            expect(result.shapes).toHaveLength(0);
        });

        it("maps coordinates to {latitude, longitude} points", () => {
            const shape = makeShape({
                geoJson: {
                    type: "LineString",
                    coordinates: [
                        [14.4, 50.1],
                        [14.5, 50.2],
                    ],
                },
            });
            const result = processRoute(makeRoute(), [], [shape]);
            expect(result.shapes[0].points).toEqual([
                { latitude: 50.1, longitude: 14.4 },
                { latitude: 50.2, longitude: 14.5 },
            ]);
        });

        it("generates geoJson string with original coordinate order", () => {
            const shape = makeShape({
                geoJson: {
                    type: "LineString",
                    coordinates: [
                        [14.4, 50.1],
                        [14.5, 50.2],
                    ],
                },
            });
            const result = processRoute(makeRoute(), [], [shape]);
            const parsed = JSON.parse(result.shapes[0].geoJson);
            expect(parsed.type).toBe("LineString");
            expect(parsed.coordinates).toEqual([
                [14.4, 50.1],
                [14.5, 50.2],
            ]);
        });

        it("sorts shapes by directionId ascending", () => {
            const shapes = [
                makeShape({ directionId: "1", shapeId: "s1", tripCount: 5 }),
                makeShape({ directionId: "0", shapeId: "s2", tripCount: 5 }),
            ];
            const result = processRoute(makeRoute(), [], shapes);
            expect(result.shapes.map((s) => s.directionId)).toEqual(["0", "1"]);
        });

        it("sorts shapes with equal directionId by tripCount descending", () => {
            const shapes = [
                makeShape({ directionId: "0", shapeId: "s1", tripCount: 3 }),
                makeShape({ directionId: "0", shapeId: "s2", tripCount: 10 }),
                makeShape({ directionId: "0", shapeId: "s3", tripCount: 7 }),
            ];
            const result = processRoute(makeRoute(), [], shapes);
            expect(result.shapes.map((s) => s.tripCount)).toEqual([10, 7, 3]);
        });

        it("sorts shapes with equal directionId and tripCount by shapeId ascending", () => {
            const shapes = [
                makeShape({
                    directionId: "0",
                    shapeId: "shape-c",
                    tripCount: 5,
                }),
                makeShape({
                    directionId: "0",
                    shapeId: "shape-a",
                    tripCount: 5,
                }),
                makeShape({
                    directionId: "0",
                    shapeId: "shape-b",
                    tripCount: 5,
                }),
            ];
            const result = processRoute(makeRoute(), [], shapes);
            expect(result.shapes.map((s) => s.id)).toEqual([
                "shape-a",
                "shape-b",
                "shape-c",
            ]);
        });

        it("maps shapeId to id, preserves directionId and tripCount", () => {
            const shape = makeShape({
                shapeId: "my-shape-id",
                directionId: "1",
                tripCount: 42,
            });
            const result = processRoute(makeRoute(), [], [shape]);
            expect(result.shapes[0].id).toBe("my-shape-id");
            expect(result.shapes[0].directionId).toBe("1");
            expect(result.shapes[0].tripCount).toBe(42);
        });
    });
});

describe("leoRouteToGraphQLRecord", () => {
    const makeLeoRoute = (overrides: Partial<LeoRoute> = {}): LeoRoute => ({
        id: "LTL:12345",
        shortName: "Leo Express",
        longName: "Leo Express Intercity",
        color: "#ff6600",
        url: "https://le.cz",
        type: "TRAIN",
        directions: [],
        shapes: [],
        ...overrides,
    });

    it("sets feedId and feed to GtfsFeedId.LEO", () => {
        const result = leoRouteToGraphQLRecord(makeLeoRoute());
        expect(result.feedId).toBe(GtfsFeedId.LEO);
        expect(result.feed).toBe(GtfsFeedId.LEO);
    });

    it("sets vehicleType to TRAIN", () => {
        const result = leoRouteToGraphQLRecord(makeLeoRoute());
        expect(result.vehicleType).toBe("TRAIN");
    });

    it("sets isNight to false", () => {
        const result = leoRouteToGraphQLRecord(makeLeoRoute());
        expect(result.isNight).toBe(false);
    });

    it("sets name from shortName", () => {
        const result = leoRouteToGraphQLRecord(
            makeLeoRoute({ shortName: "LE" }),
        );
        expect(result.name).toBe("LE");
        expect(result.shortName).toBe("LE");
    });

    it("maps id, longName, color, url, type directly", () => {
        const result = leoRouteToGraphQLRecord(makeLeoRoute());
        expect(result.id).toBe("LTL:12345");
        expect(result.longName).toBe("Leo Express Intercity");
        expect(result.color).toBe("#ff6600");
        expect(result.url).toBe("https://le.cz");
        expect(result.type).toBe("TRAIN");
    });

    it("handles null longName", () => {
        const result = leoRouteToGraphQLRecord(
            makeLeoRoute({ longName: null }),
        );
        expect(result.longName).toBe("");
    });

    it("maps directions with platforms", () => {
        const leo = makeLeoRoute({
            directions: [
                {
                    id: "0",
                    platforms: [
                        {
                            id: "P1",
                            name: "Prague hl.n.",
                            latitude: 50.083,
                            longitude: 14.435,
                            isMetro: false,
                            code: null,
                        },
                    ],
                },
            ],
        });
        const result = leoRouteToGraphQLRecord(leo);
        expect(result.directions).toHaveLength(1);
        expect(result.directions[0].id).toBe("0");
        expect(result.directions[0].platforms).toHaveLength(1);
        expect(result.directions[0].platforms[0].id).toBe("P1");
    });

    it("maps shapes with points and geoJson", () => {
        const leo = makeLeoRoute({
            shapes: [
                {
                    id: "s1",
                    directionId: "0",
                    tripCount: 5,
                    geoJson:
                        '{"type":"LineString","coordinates":[[14.4,50.1]]}',
                    points: [{ latitude: 50.1, longitude: 14.4 }],
                },
            ],
        });
        const result = leoRouteToGraphQLRecord(leo);
        expect(result.shapes).toHaveLength(1);
        expect(result.shapes[0].id).toBe("s1");
        expect(result.shapes[0].directionId).toBe("0");
        expect(result.shapes[0].tripCount).toBe(5);
        expect(result.shapes[0].geoJson).toBe(
            '{"type":"LineString","coordinates":[[14.4,50.1]]}',
        );
        expect(result.shapes[0].points).toEqual([
            { latitude: 50.1, longitude: 14.4 },
        ]);
    });

    it("returns empty directions and shapes for routes without them", () => {
        const result = leoRouteToGraphQLRecord(
            makeLeoRoute({ directions: [], shapes: [] }),
        );
        expect(result.directions).toHaveLength(0);
        expect(result.shapes).toHaveLength(0);
    });
});
