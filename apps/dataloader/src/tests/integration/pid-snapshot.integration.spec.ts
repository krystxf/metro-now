import assert from "node:assert/strict";
import test from "node:test";

import { PidImportService } from "../../services/imports/pid-import.service";

test("integration: PidImportService builds a snapshot from realistic multi-group stop data", () => {
    const service = new PidImportService();

    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            {
                name: "Václavské náměstí",
                node: 1072,
                avgLat: 50.0818,
                avgLon: 14.4255,
                stops: [
                    {
                        lat: 50.0831,
                        lon: 14.425,
                        gtfsIds: ["U1072Z101P"],
                        altIdosName: "Můstek",
                        isMetro: true,
                        platform: "1",
                        lines: [{ id: "991", name: "A", type: "METRO" }],
                    },
                    {
                        lat: 50.0839,
                        lon: 14.4241,
                        gtfsIds: ["U1072Z102P"],
                        altIdosName: "Můstek",
                        isMetro: true,
                        platform: "2",
                        lines: [{ id: "991", name: "A", type: "METRO" }],
                    },
                    {
                        lat: 50.0817,
                        lon: 14.4253,
                        gtfsIds: ["U1072Z1P"],
                        altIdosName: "Václavské náměstí",
                        isMetro: false,
                        platform: "A",
                        lines: [
                            { id: "L3", name: "3", type: "TRAM" },
                            { id: "L9", name: "9", type: "TRAM" },
                        ],
                    },
                ],
            },
            {
                name: "Malostranská",
                node: 456,
                avgLat: 50.0886,
                avgLon: 14.4098,
                stops: [
                    {
                        lat: 50.0886,
                        lon: 14.4098,
                        gtfsIds: ["U456Z101P"],
                        altIdosName: "Malostranská",
                        isMetro: true,
                        platform: "1",
                        lines: [{ id: "991", name: "A", type: "METRO" }],
                    },
                    {
                        lat: 50.0887,
                        lon: 14.4099,
                        gtfsIds: ["U456Z102P"],
                        altIdosName: "Malostranská",
                        isMetro: true,
                        platform: "2",
                        lines: [{ id: "991", name: "A", type: "METRO" }],
                    },
                ],
            },
            {
                name: "Anděl",
                node: 789,
                avgLat: 50.0702,
                avgLon: 14.4035,
                stops: [
                    {
                        lat: 50.0702,
                        lon: 14.4035,
                        gtfsIds: ["U789Z1P"],
                        altIdosName: "Anděl",
                        isMetro: false,
                        platform: "A",
                        lines: [{ id: "L12", name: "12", type: "TRAM" }],
                    },
                ],
            },
        ],
    });

    // stops: metro groups use metro name, non-metro groups use group name
    assert.equal(snapshot.stops.length, 3);

    const mustek = snapshot.stops.find((s) => s.id === "U1072");

    assert.ok(mustek);
    assert.equal(mustek.name, "Můstek");

    const malostranska = snapshot.stops.find((s) => s.id === "U456");

    assert.ok(malostranska);
    assert.equal(malostranska.name, "Malostranská");

    const andel = snapshot.stops.find((s) => s.id === "U789");

    assert.ok(andel);
    assert.equal(andel.name, "Anděl");

    // platforms: 6 total (3 Můstek + 2 Malostranská + 1 Anděl)
    assert.equal(snapshot.platforms.length, 6);

    const metroPlatforms = snapshot.platforms.filter((p) => p.isMetro);

    assert.equal(metroPlatforms.length, 4);

    const tramPlatform = snapshot.platforms.find((p) => p.id === "U1072Z1P");

    assert.ok(tramPlatform);
    assert.equal(tramPlatform.isMetro, false);
    assert.equal(tramPlatform.code, "A");
    assert.equal(tramPlatform.stopId, "U1072");

    // routes: A, 3, 9, 12
    assert.equal(snapshot.gtfsRoutes.length, 4);

    const routeNames = snapshot.gtfsRoutes.map((r) => r.shortName).sort();

    assert.deepEqual(routeNames, ["12", "3", "9", "A"]);

    // platform routes connect platforms to routes
    assert.ok(snapshot.platformRoutes.length > 0);

    const aPlatformRoutes = snapshot.platformRoutes.filter(
        (pr) => pr.routeId === "991",
    );

    // metro line A serves 4 metro platforms
    assert.equal(aPlatformRoutes.length, 4);
});

test("integration: PID snapshot with platforms linking back to valid stops", () => {
    const service = new PidImportService();

    const snapshot = service.buildStopSnapshot({
        dataFormatVersion: "3",
        stopGroups: [
            {
                name: "Dejvická",
                node: 100,
                avgLat: 50.1,
                avgLon: 14.4,
                stops: [
                    {
                        lat: 50.1,
                        lon: 14.4,
                        gtfsIds: ["U100Z101P"],
                        altIdosName: "Dejvická",
                        isMetro: true,
                        platform: "1",
                        lines: [],
                    },
                ],
            },
        ],
    });

    const stopIds = new Set(snapshot.stops.map((s) => s.id));

    for (const platform of snapshot.platforms) {
        if (platform.stopId) {
            assert.ok(
                stopIds.has(platform.stopId),
                `Platform ${platform.id} references missing stop ${platform.stopId}`,
            );
        }
    }
});
