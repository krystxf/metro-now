import { titleByMetroStation } from "../data/metro-stations";
import { getPlatformsByStation } from "./station";

describe("getPlatformsByStation", () => {
    it("should return null when incorrect station is provided", () => {
        expect(getPlatformsByStation("abcdef")).toBeNull();
        expect(getPlatformsByStation("Křižkova")).toBeNull();
    });

    it("should return empty array when incorrect stations are provided", () => {
        expect(getPlatformsByStation(["abcdef", "xyz"])).toStrictEqual([]);
        expect(getPlatformsByStation(["Křižkova"])).toStrictEqual([]);
        expect(getPlatformsByStation(["Křižkova", "Anel"])).toStrictEqual([]);
    });

    it("should return null when station is not provided", () => {
        expect(getPlatformsByStation(undefined)).toBeNull();
    });

    it("should return platforms", () => {
        expect(getPlatformsByStation(titleByMetroStation.andel)).toStrictEqual([
            "U1040Z101P",
            "U1040Z102P",
        ]);

        expect(
            getPlatformsByStation(titleByMetroStation.borislavka),
        ).toStrictEqual(["U157Z101P", "U157Z102P"]);

        expect(getPlatformsByStation("budejovicka")).toStrictEqual([
            "U50Z101P",
            "U50Z102P",
        ]);

        expect(getPlatformsByStation("BuDeJoViCkA")).toStrictEqual([
            "U50Z101P",
            "U50Z102P",
        ]);

        expect(getPlatformsByStation("CERNY-MOST")).toStrictEqual([
            "U897Z101P",
        ]);
    });

    it("should return platforms when multiple stations are provided", () => {
        expect(
            getPlatformsByStation([titleByMetroStation.andel]),
        ).toStrictEqual(["U1040Z101P", "U1040Z102P"]);

        expect(
            getPlatformsByStation([titleByMetroStation.andel, undefined, ""]),
        ).toStrictEqual(["U1040Z101P", "U1040Z102P"]);

        expect(
            getPlatformsByStation([titleByMetroStation.borislavka]),
        ).toStrictEqual(["U157Z101P", "U157Z102P"]);

        expect(getPlatformsByStation(["budejovicka"])).toStrictEqual([
            "U50Z101P",
            "U50Z102P",
        ]);

        expect(getPlatformsByStation(["BuDeJoViCkA"])).toStrictEqual([
            "U50Z101P",
            "U50Z102P",
        ]);

        expect(getPlatformsByStation(["CERNY-MOST"])).toStrictEqual([
            "U897Z101P",
        ]);

        expect(getPlatformsByStation(["CERNY-MOST", "CRN_MOST"])).toStrictEqual(
            ["U897Z101P"],
        );

        expect(
            getPlatformsByStation([
                "CERNY-MOST",
                titleByMetroStation.andel,
                titleByMetroStation.borislavka,
            ]),
        ).toStrictEqual([
            "U897Z101P",
            "U1040Z101P",
            "U1040Z102P",
            "U157Z101P",
            "U157Z102P",
        ]);
    });
});
