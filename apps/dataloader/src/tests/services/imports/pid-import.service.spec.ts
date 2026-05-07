import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId, VehicleType } from "@metro-now/database";

import { PidImportService } from "../../../services/imports/pid-import.service";

const service = new PidImportService();

const makeStopGroup = (
    overrides: {
        name?: string;
        node?: number;
        avgLat?: number;
        avgLon?: number;
        stops?: Array<{
            lat: number;
            lon: number;
            gtfsIds: string[];
            altIdosName: string;
            isMetro?: boolean;
            platform?: string | null;
            lines: Array<{ id: string; name: string; type: string }>;
        }>;
    } = {},
) => ({
    name: "Test Stop",
    node: 1000,
    avgLat: 50.0,
    avgLon: 14.0,
    stops: [],
    ...overrides,
});

test("PidImportService prefers the metro platform name for metro stop groups", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            {
                name: "Václavské náměstí",
                node: 1072,
                avgLat: 50.0818176,
                avgLon: 14.4255056,
                stops: [
                    {
                        lat: 50.08312,
                        lon: 14.4249659,
                        gtfsIds: ["U1072Z101P"],
                        altIdosName: "Můstek",
                        isMetro: true,
                        platform: "1",
                        lines: [],
                    },
                    {
                        lat: 50.0839424,
                        lon: 14.4241495,
                        gtfsIds: ["U1072Z102P"],
                        altIdosName: "Můstek",
                        isMetro: true,
                        platform: "2",
                        lines: [],
                    },
                    {
                        lat: 50.08167,
                        lon: 14.4252787,
                        gtfsIds: ["U1072Z1P"],
                        altIdosName: "Václavské náměstí",
                        isMetro: false,
                        platform: "A",
                        lines: [],
                    },
                ],
            },
        ],
    });

    assert.deepEqual(snapshot.stops, [
        {
            id: "U1072",
            feed: GtfsFeedId.PID,
            name: "Můstek",
            avgLatitude: 50.0818176,
            avgLongitude: 14.4255056,
        },
    ]);
});

test("PidImportService keeps the shared stop-group name when no metro platforms exist", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            {
                name: "Václavské náměstí",
                node: 1072,
                avgLat: 50.0818176,
                avgLon: 14.4255056,
                stops: [
                    {
                        lat: 50.08167,
                        lon: 14.4252787,
                        gtfsIds: ["U1072Z1P"],
                        altIdosName: "Václavské náměstí",
                        isMetro: false,
                        platform: "A",
                        lines: [],
                    },
                ],
            },
        ],
    });

    assert.deepEqual(snapshot.stops, [
        {
            id: "U1072",
            feed: GtfsFeedId.PID,
            name: "Václavské náměstí",
            avgLatitude: 50.0818176,
            avgLongitude: 14.4255056,
        },
    ]);
});

test("PidImportService falls back to group name when metro platforms have different names", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                name: "Group Name",
                node: 1000,
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z1P"],
                        altIdosName: "Name A",
                        isMetro: true,
                        platform: "1",
                        lines: [],
                    },
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z2P"],
                        altIdosName: "Name B",
                        isMetro: true,
                        platform: "2",
                        lines: [],
                    },
                ],
            }),
        ],
    });

    assert.equal(snapshot.stops[0]?.name, "Group Name");
});

test("PidImportService falls back to group name when metro altIdosName is whitespace-only", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                name: "Group Name",
                node: 1000,
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z1P"],
                        altIdosName: "   ",
                        isMetro: true,
                        platform: "1",
                        lines: [],
                    },
                ],
            }),
        ],
    });

    assert.equal(snapshot.stops[0]?.name, "Group Name");
});

test("PidImportService skips platforms with empty gtfsIds array", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: [],
                        altIdosName: "Test Stop",
                        isMetro: false,
                        platform: "A",
                        lines: [],
                    },
                ],
            }),
        ],
    });

    assert.equal(snapshot.platforms.length, 0);
});

test("PidImportService skips platforms with empty altIdosName", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z1P"],
                        altIdosName: "",
                        isMetro: false,
                        platform: "A",
                        lines: [],
                    },
                ],
            }),
        ],
    });

    assert.equal(snapshot.platforms.length, 0);
});

test("PidImportService sets stopId to null when platform ID does not match any stop group", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                node: 1000,
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U9999Z1P"],
                        altIdosName: "Orphan Platform",
                        isMetro: false,
                        platform: "A",
                        lines: [],
                    },
                ],
            }),
        ],
    });

    assert.equal(snapshot.platforms[0]?.stopId, null);
});

test("PidImportService maps PID line types to GTFS route types", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z1P"],
                        altIdosName: "Stop",
                        isMetro: false,
                        platform: "A",
                        lines: [
                            { id: "1", name: "1", type: "tram" },
                            { id: "2", name: "A", type: "metro" },
                            { id: "3", name: "1", type: "train" },
                            { id: "4", name: "100", type: "bus" },
                            { id: "5", name: "P1", type: "ferry" },
                            { id: "6", name: "LD", type: "funicular" },
                            { id: "7", name: "58", type: "trolleybus" },
                        ],
                    },
                ],
            }),
        ],
    });

    const routeTypeById = new Map(
        snapshot.gtfsRoutes.map((r) => [r.id, r.type]),
    );

    assert.equal(routeTypeById.get("1"), "0");
    assert.equal(routeTypeById.get("2"), "1");
    assert.equal(routeTypeById.get("3"), "2");
    assert.equal(routeTypeById.get("4"), "3");
    assert.equal(routeTypeById.get("5"), "4");
    assert.equal(routeTypeById.get("6"), "7");
    assert.equal(routeTypeById.get("7"), "11");
});

test("PidImportService maps unknown line type to empty GTFS route type string", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z1P"],
                        altIdosName: "Stop",
                        isMetro: false,
                        platform: "A",
                        lines: [{ id: "X1", name: "X1", type: "unknown_type" }],
                    },
                ],
            }),
        ],
    });

    assert.equal(snapshot.gtfsRoutes[0]?.type, "");
});

test("PidImportService sets isNight to true for night bus routes", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z1P"],
                        altIdosName: "Stop",
                        isMetro: false,
                        platform: "A",
                        lines: [{ id: "91", name: "91", type: "bus" }],
                    },
                ],
            }),
        ],
    });

    assert.equal(snapshot.gtfsRoutes[0]?.isNight, true);
    assert.equal(snapshot.gtfsRoutes[0]?.vehicleType, VehicleType.BUS);
});

test("PidImportService deduplicates routes that appear on multiple platforms", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z1P"],
                        altIdosName: "Stop Direction A",
                        isMetro: false,
                        platform: "A",
                        lines: [{ id: "10", name: "10", type: "tram" }],
                    },
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z2P"],
                        altIdosName: "Stop Direction B",
                        isMetro: false,
                        platform: "B",
                        lines: [{ id: "10", name: "10", type: "tram" }],
                    },
                ],
            }),
        ],
    });

    assert.equal(snapshot.gtfsRoutes.filter((r) => r.id === "10").length, 1);
    assert.equal(
        snapshot.platformRoutes.filter((pr) => pr.routeId === "10").length,
        2,
    );
});

test("PidImportService builds correct platformRoutes with feedId and routeId", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            makeStopGroup({
                stops: [
                    {
                        lat: 50.0,
                        lon: 14.0,
                        gtfsIds: ["U1000Z1P"],
                        altIdosName: "Stop",
                        isMetro: false,
                        platform: "A",
                        lines: [{ id: "22", name: "22", type: "tram" }],
                    },
                ],
            }),
        ],
    });

    assert.deepEqual(snapshot.platformRoutes, [
        { platformId: "U1000Z1P", feedId: GtfsFeedId.PID, routeId: "22" },
    ]);
});

test("PidImportService returns empty snapshot for empty stopGroups", () => {
    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [],
    });

    assert.equal(snapshot.stops.length, 0);
    assert.equal(snapshot.platforms.length, 0);
    assert.equal(snapshot.gtfsRoutes.length, 0);
    assert.equal(snapshot.platformRoutes.length, 0);
});
