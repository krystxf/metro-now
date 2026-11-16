import { GtfsFeedId } from "@metro-now/database";
import {
    ClassifiedVehicleType,
    classifyRoute,
    getVehicleTypeFromGtfsRouteType,
} from "@metro-now/shared";

describe("classifyRoute", () => {
    describe("empty / null inputs", () => {
        it("returns null vehicleType for null routeShortName", () => {
            expect(
                classifyRoute({ feedId: GtfsFeedId.PID, routeShortName: null }),
            ).toEqual({
                vehicleType: null,
                isNight: null,
                isSubstitute: false,
            });
        });

        it("returns null vehicleType for undefined routeShortName", () => {
            expect(
                classifyRoute({
                    feedId: GtfsFeedId.PID,
                    routeShortName: undefined,
                }),
            ).toEqual({
                vehicleType: null,
                isNight: null,
                isSubstitute: false,
            });
        });

        it("returns null vehicleType for empty string", () => {
            expect(
                classifyRoute({ feedId: GtfsFeedId.PID, routeShortName: "" }),
            ).toEqual({
                vehicleType: null,
                isNight: null,
                isSubstitute: false,
            });
        });

        it("uses GTFS route type when route name is empty", () => {
            expect(
                classifyRoute({
                    feedId: GtfsFeedId.PID,
                    routeShortName: null,
                    routeType: "0",
                }),
            ).toEqual({
                vehicleType: ClassifiedVehicleType.TRAM,
                isNight: null,
                isSubstitute: false,
            });
        });

        it("returns null vehicleType for null feedId", () => {
            expect(
                classifyRoute({ feedId: null, routeShortName: "22" }),
            ).toEqual({
                vehicleType: null,
                isNight: null,
                isSubstitute: false,
            });
        });
    });

    describe("PID feed", () => {
        const pid = (routeShortName: string, routeType?: string | null) =>
            classifyRoute({
                feedId: GtfsFeedId.PID,
                routeShortName,
                routeType,
            });

        describe("metro lines", () => {
            it.each(["A", "B", "C", "D"])("classifies %s as SUBWAY", (line) => {
                expect(pid(line)).toEqual({
                    vehicleType: ClassifiedVehicleType.SUBWAY,
                    isNight: false,
                    isSubstitute: false,
                });
            });

            it("classifies lowercase metro line", () => {
                expect(pid("a").vehicleType).toBe(ClassifiedVehicleType.SUBWAY);
            });
        });

        describe("trams", () => {
            it.each(["1", "22", "9", "15"])(
                "classifies route %s as TRAM",
                (route) => {
                    expect(pid(route).vehicleType).toBe(
                        ClassifiedVehicleType.TRAM,
                    );
                },
            );

            it("classifies route 99 boundary as TRAM (night)", () => {
                const result = pid("99");
                expect(result.vehicleType).toBe(ClassifiedVehicleType.TRAM);
                expect(result.isNight).toBe(true);
            });
        });

        describe("trolleybuses", () => {
            it.each(["52", "58", "59"])(
                "classifies route %s as TROLLEYBUS",
                (route) => {
                    expect(pid(route).vehicleType).toBe(
                        ClassifiedVehicleType.TROLLEYBUS,
                    );
                },
            );
        });

        describe("buses", () => {
            it.each(["100", "119", "200", "510"])(
                "classifies route %s as BUS",
                (route) => {
                    expect(pid(route).vehicleType).toBe(
                        ClassifiedVehicleType.BUS,
                    );
                },
            );

            it.each(["AE", "K", "BB"])(
                "classifies %s-prefixed route as BUS",
                (prefix) => {
                    expect(pid(prefix).vehicleType).toBe(
                        ClassifiedVehicleType.BUS,
                    );
                },
            );
        });

        describe("trains", () => {
            it.each(["S9", "R10", "L1", "U1", "V1", "T1"])(
                "classifies %s as TRAIN",
                (route) => {
                    expect(pid(route).vehicleType).toBe(
                        ClassifiedVehicleType.TRAIN,
                    );
                },
            );

            it.each([
                "OS",
                "REX",
                "RR",
                "EX",
                "EC",
                "EN",
                "RJX",
                "RJ",
                "IC",
                "SC",
                "LE",
            ])("classifies %s prefix as TRAIN", (prefix) => {
                expect(pid(`${prefix}1`).vehicleType).toBe(
                    ClassifiedVehicleType.TRAIN,
                );
            });
        });

        describe("ferries", () => {
            it.each(["P", "P1", "P2"])("classifies %s as FERRY", (route) => {
                expect(pid(route).vehicleType).toBe(
                    ClassifiedVehicleType.FERRY,
                );
            });
        });

        describe("funicular", () => {
            it("classifies LD as FUNICULAR", () => {
                expect(pid("LD").vehicleType).toBe(
                    ClassifiedVehicleType.FUNICULAR,
                );
            });
        });

        describe("night routes", () => {
            it.each(["90", "91", "95", "99"])(
                "marks tram route %s as night",
                (route) => {
                    expect(pid(route).isNight).toBe(true);
                },
            );

            it.each(["900", "910", "950", "999"])(
                "marks bus route %s as night",
                (route) => {
                    expect(pid(route).isNight).toBe(true);
                },
            );

            it.each(["22", "100", "200", "A", "S9"])(
                "marks route %s as not night",
                (route) => {
                    expect(pid(route).isNight).toBe(false);
                },
            );

            it("marks route 89 as not night (boundary)", () => {
                expect(pid("89").isNight).toBe(false);
            });

            it("marks route 899 as not night (boundary)", () => {
                expect(pid("899").isNight).toBe(false);
            });
        });

        describe("substitute routes", () => {
            it("detects X prefix as substitute", () => {
                expect(pid("X22").isSubstitute).toBe(true);
            });

            it("classifies substitute tram by underlying route", () => {
                expect(pid("X22").vehicleType).toBe(ClassifiedVehicleType.TRAM);
            });

            it("classifies substitute bus by underlying route", () => {
                expect(pid("X119").vehicleType).toBe(ClassifiedVehicleType.BUS);
            });

            it("non-substitute route has isSubstitute false", () => {
                expect(pid("22").isSubstitute).toBe(false);
            });
        });

        describe("GTFS route type override", () => {
            it("uses GTFS type for numeric route when no name-based match", () => {
                const result = pid("50", "11");
                expect(result.vehicleType).toBe(
                    ClassifiedVehicleType.TROLLEYBUS,
                );
            });

            it("prefers name-based metro over GTFS type", () => {
                expect(pid("A", "3").vehicleType).toBe(
                    ClassifiedVehicleType.SUBWAY,
                );
            });

            it("prefers name-based ferry over GTFS type", () => {
                expect(pid("P1", "3").vehicleType).toBe(
                    ClassifiedVehicleType.FERRY,
                );
            });
        });

        describe("unknown routes", () => {
            it("defaults to BUS for unknown non-numeric route", () => {
                expect(pid("ZZZ").vehicleType).toBe(ClassifiedVehicleType.BUS);
            });
        });
    });

    describe("BRNO feed", () => {
        const brno = (routeShortName: string, routeType?: string | null) =>
            classifyRoute({
                feedId: GtfsFeedId.BRNO,
                routeShortName,
                routeType,
            });

        describe("trams", () => {
            it.each(["1", "5", "8", "12"])(
                "classifies route %s as TRAM",
                (route) => {
                    expect(brno(route).vehicleType).toBe(
                        ClassifiedVehicleType.TRAM,
                    );
                },
            );

            it("does not classify 13 as TRAM", () => {
                expect(brno("13").vehicleType).not.toBe(
                    ClassifiedVehicleType.TRAM,
                );
            });
        });

        describe("trolleybuses", () => {
            it.each(["25", "30", "40"])(
                "classifies route %s as TROLLEYBUS",
                (route) => {
                    expect(brno(route).vehicleType).toBe(
                        ClassifiedVehicleType.TROLLEYBUS,
                    );
                },
            );
        });

        describe("trains", () => {
            it.each(["S1", "S3", "R10"])("classifies %s as TRAIN", (route) => {
                expect(brno(route).vehicleType).toBe(
                    ClassifiedVehicleType.TRAIN,
                );
            });
        });

        describe("night routes", () => {
            it.each(["N89", "N90", "N99"])("marks %s as night BUS", (route) => {
                const result = brno(route);
                expect(result.isNight).toBe(true);
                expect(result.vehicleType).toBe(ClassifiedVehicleType.BUS);
            });

            it("marks regular tram route as not night", () => {
                expect(brno("8").isNight).toBe(false);
            });
        });

        describe("buses", () => {
            it.each(["50", "67", "100"])(
                "classifies route %s as BUS",
                (route) => {
                    expect(brno(route).vehicleType).toBe(
                        ClassifiedVehicleType.BUS,
                    );
                },
            );
        });

        describe("substitute routes", () => {
            it("detects X prefix as substitute", () => {
                expect(brno("xS3").isSubstitute).toBe(true);
            });

            it("classifies substitute train correctly", () => {
                expect(brno("xS3").vehicleType).toBe(
                    ClassifiedVehicleType.TRAIN,
                );
            });
        });
    });

    describe("BRATISLAVA feed", () => {
        const bratislava = (
            routeShortName: string,
            routeType?: string | null,
        ) =>
            classifyRoute({
                feedId: GtfsFeedId.BRATISLAVA,
                routeShortName,
                routeType,
            });

        describe("trams", () => {
            it.each(["1", "5", "9"])("classifies route %s as TRAM", (route) => {
                expect(bratislava(route).vehicleType).toBe(
                    ClassifiedVehicleType.TRAM,
                );
            });

            it("does not classify 10 as TRAM", () => {
                expect(bratislava("10").vehicleType).not.toBe(
                    ClassifiedVehicleType.TRAM,
                );
            });
        });

        describe("night routes", () => {
            it.each(["N21", "N50", "N99"])("marks %s as night BUS", (route) => {
                const result = bratislava(route);
                expect(result.isNight).toBe(true);
                expect(result.vehicleType).toBe(ClassifiedVehicleType.BUS);
            });

            it("does not mark N20 as night", () => {
                expect(bratislava("N20").isNight).not.toBe(true);
            });
        });

        describe("buses and trolleybuses (20-212 range)", () => {
            it("uses GTFS route type 11 for trolleybus", () => {
                expect(bratislava("201", "11").vehicleType).toBe(
                    ClassifiedVehicleType.TROLLEYBUS,
                );
            });

            it("uses GTFS route type 3 for bus", () => {
                expect(bratislava("201", "3").vehicleType).toBe(
                    ClassifiedVehicleType.BUS,
                );
            });

            it("defaults to BUS without GTFS type", () => {
                expect(bratislava("201").vehicleType).toBe(
                    ClassifiedVehicleType.BUS,
                );
            });
        });
    });

    describe("LIBEREC feed", () => {
        const liberec = (routeShortName: string, routeType?: string | null) =>
            classifyRoute({
                feedId: GtfsFeedId.LIBEREC,
                routeShortName,
                routeType,
            });

        describe("trams", () => {
            it.each(["2", "3", "5", "11"])(
                "classifies route %s as TRAM",
                (route) => {
                    expect(liberec(route).vehicleType).toBe(
                        ClassifiedVehicleType.TRAM,
                    );
                },
            );

            it("keeps tram classification even when GTFS type disagrees", () => {
                expect(liberec("11", "11").vehicleType).toBe(
                    ClassifiedVehicleType.TRAM,
                );
            });
        });

        describe("night routes", () => {
            it.each(["91", "92", "93", "94"])(
                "marks route %s as night BUS",
                (route) => {
                    const result = liberec(route);
                    expect(result.isNight).toBe(true);
                    expect(result.vehicleType).toBe(ClassifiedVehicleType.BUS);
                },
            );

            it("does not mark route 90 as night", () => {
                expect(liberec("90").isNight).toBe(false);
            });

            it("does not mark route 95 as night", () => {
                expect(liberec("95").isNight).toBe(false);
            });
        });

        describe("buses", () => {
            it.each(["20", "30", "50"])(
                "classifies route %s as BUS",
                (route) => {
                    expect(liberec(route).vehicleType).toBe(
                        ClassifiedVehicleType.BUS,
                    );
                },
            );
        });
    });

    describe("LEO feed", () => {
        it("always classifies as TRAIN", () => {
            expect(
                classifyRoute({
                    feedId: GtfsFeedId.LEO,
                    routeShortName: "anything",
                }),
            ).toEqual({
                vehicleType: ClassifiedVehicleType.TRAIN,
                isNight: false,
                isSubstitute: false,
            });
        });
    });

    describe("ZSR feed", () => {
        it("always classifies as TRAIN", () => {
            expect(
                classifyRoute({
                    feedId: GtfsFeedId.ZSR,
                    routeShortName: "anything",
                }),
            ).toEqual({
                vehicleType: ClassifiedVehicleType.TRAIN,
                isNight: false,
                isSubstitute: false,
            });
        });
    });

    describe("PMDP feed (fallback)", () => {
        it("returns GTFS type when available", () => {
            expect(
                classifyRoute({
                    feedId: GtfsFeedId.PMDP,
                    routeShortName: "1",
                    routeType: "0",
                }),
            ).toEqual({
                vehicleType: ClassifiedVehicleType.TRAM,
                isNight: null,
                isSubstitute: false,
            });
        });

        it("returns null vehicleType without GTFS type", () => {
            expect(
                classifyRoute({
                    feedId: GtfsFeedId.PMDP,
                    routeShortName: "1",
                }),
            ).toEqual({
                vehicleType: null,
                isNight: null,
                isSubstitute: false,
            });
        });
    });

    describe("USTI feed (fallback)", () => {
        it("returns GTFS type when available", () => {
            expect(
                classifyRoute({
                    feedId: GtfsFeedId.USTI,
                    routeShortName: "106",
                    routeType: "3",
                }),
            ).toEqual({
                vehicleType: ClassifiedVehicleType.BUS,
                isNight: null,
                isSubstitute: false,
            });
        });
    });
});

describe("getVehicleTypeFromGtfsRouteType", () => {
    it("returns null for null", () => {
        expect(getVehicleTypeFromGtfsRouteType(null)).toBeNull();
    });

    it("returns null for undefined", () => {
        expect(getVehicleTypeFromGtfsRouteType(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
        expect(getVehicleTypeFromGtfsRouteType("")).toBeNull();
    });

    it("returns null for non-numeric", () => {
        expect(getVehicleTypeFromGtfsRouteType("abc")).toBeNull();
    });

    it("returns TRAM for type 0", () => {
        expect(getVehicleTypeFromGtfsRouteType("0")).toBe(
            ClassifiedVehicleType.TRAM,
        );
    });

    it("returns SUBWAY for type 1", () => {
        expect(getVehicleTypeFromGtfsRouteType("1")).toBe(
            ClassifiedVehicleType.SUBWAY,
        );
    });

    it("returns TRAIN for type 2", () => {
        expect(getVehicleTypeFromGtfsRouteType("2")).toBe(
            ClassifiedVehicleType.TRAIN,
        );
    });

    it("returns BUS for type 3", () => {
        expect(getVehicleTypeFromGtfsRouteType("3")).toBe(
            ClassifiedVehicleType.BUS,
        );
    });

    it("returns FERRY for type 4", () => {
        expect(getVehicleTypeFromGtfsRouteType("4")).toBe(
            ClassifiedVehicleType.FERRY,
        );
    });

    it("returns FUNICULAR for type 7", () => {
        expect(getVehicleTypeFromGtfsRouteType("7")).toBe(
            ClassifiedVehicleType.FUNICULAR,
        );
    });

    it("returns TROLLEYBUS for type 11", () => {
        expect(getVehicleTypeFromGtfsRouteType("11")).toBe(
            ClassifiedVehicleType.TROLLEYBUS,
        );
    });

    it("returns TRAM for extended range 900-999", () => {
        expect(getVehicleTypeFromGtfsRouteType("900")).toBe(
            ClassifiedVehicleType.TRAM,
        );
    });

    it("returns TRAIN for extended range 100-199", () => {
        expect(getVehicleTypeFromGtfsRouteType("100")).toBe(
            ClassifiedVehicleType.TRAIN,
        );
    });

    it("returns BUS for extended range 200-799", () => {
        expect(getVehicleTypeFromGtfsRouteType("200")).toBe(
            ClassifiedVehicleType.BUS,
        );
    });

    it("returns FERRY for extended range 1000-1099", () => {
        expect(getVehicleTypeFromGtfsRouteType("1000")).toBe(
            ClassifiedVehicleType.FERRY,
        );
    });

    it("returns FUNICULAR for extended type 1400", () => {
        expect(getVehicleTypeFromGtfsRouteType("1400")).toBe(
            ClassifiedVehicleType.FUNICULAR,
        );
    });

    it("returns null for unmapped type 5", () => {
        expect(getVehicleTypeFromGtfsRouteType("5")).toBeNull();
    });

    it("returns null for unmapped type 1100", () => {
        expect(getVehicleTypeFromGtfsRouteType("1100")).toBeNull();
    });
});
