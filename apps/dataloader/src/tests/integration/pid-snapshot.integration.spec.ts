import { PidImportService } from "src/services/imports/pid-import.service";

describe("PidImportService (integration)", () => {
    it("builds a snapshot from realistic multi-group stop data", () => {
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

        expect(snapshot.stops).toHaveLength(3);

        const mustek = snapshot.stops.find((s) => s.id === "U1072");

        expect(mustek).toBeDefined();
        expect(mustek?.name).toBe("Můstek");

        const malostranska = snapshot.stops.find((s) => s.id === "U456");

        expect(malostranska).toBeDefined();
        expect(malostranska?.name).toBe("Malostranská");

        const andel = snapshot.stops.find((s) => s.id === "U789");

        expect(andel).toBeDefined();
        expect(andel?.name).toBe("Anděl");

        expect(snapshot.platforms).toHaveLength(6);

        const metroPlatforms = snapshot.platforms.filter((p) => p.isMetro);

        expect(metroPlatforms).toHaveLength(4);

        const tramPlatform = snapshot.platforms.find(
            (p) => p.id === "U1072Z1P",
        );

        expect(tramPlatform).toBeDefined();
        expect(tramPlatform?.isMetro).toBe(false);
        expect(tramPlatform?.code).toBe("A");
        expect(tramPlatform?.stopId).toBe("U1072");

        expect(snapshot.routes).toHaveLength(4);

        const routeNames = snapshot.routes.map((r) => r.name).sort();

        expect(routeNames).toEqual(["12", "3", "9", "A"]);

        expect(snapshot.platformRoutes.length).toBeGreaterThan(0);

        const aPlatformRoutes = snapshot.platformRoutes.filter(
            (pr) => pr.routeId === "991",
        );

        expect(aPlatformRoutes).toHaveLength(4);
    });

    it("links every platform.stopId to an existing stop", () => {
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
                expect(stopIds.has(platform.stopId)).toBe(true);
            }
        }
    });
});
