import { PidImportService } from "src/services/imports/pid-import.service";

describe("PidImportService", () => {
    it("prefers the metro platform name for metro stop groups", () => {
        const service = new PidImportService();

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

        expect(snapshot.stops).toEqual([
            {
                id: "U1072",
                name: "Můstek",
                avgLatitude: 50.0818176,
                avgLongitude: 14.4255056,
            },
        ]);
    });

    it("keeps the shared stop-group name when no metro platforms exist", () => {
        const service = new PidImportService();

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

        expect(snapshot.stops).toEqual([
            {
                id: "U1072",
                name: "Václavské náměstí",
                avgLatitude: 50.0818176,
                avgLongitude: 14.4255056,
            },
        ]);
    });
});
