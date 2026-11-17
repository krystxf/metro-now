import { GtfsFeedId } from "@metro-now/database";

import {
    getVehicleTypeForRoute,
    isMissingTableError,
    isNightRoute,
    isSubstituteRoute,
} from "src/modules/route/route-logic.utils";
import { VehicleType } from "src/types/graphql.generated";

describe("isMissingTableError", () => {
    it("returns true for Postgres undefined_table error code 42P01", () => {
        expect(isMissingTableError({ code: "42P01" }, "GtfsRouteShape")).toBe(
            true,
        );
    });

    it("returns true for Error with relation … does not exist message", () => {
        expect(
            isMissingTableError(
                new Error(`relation "GtfsRouteShape" does not exist`),
                "GtfsRouteShape",
            ),
        ).toBe(true);
    });

    it("returns false for a different Postgres error code", () => {
        expect(isMissingTableError({ code: "23505" }, "GtfsRouteShape")).toBe(
            false,
        );
    });

    it("returns false for a generic Error without the expected message", () => {
        expect(
            isMissingTableError(
                new Error("some other database error"),
                "GtfsRouteShape",
            ),
        ).toBe(false);
    });

    it("returns false for a non-object error value", () => {
        expect(isMissingTableError("string error", "GtfsRouteShape")).toBe(
            false,
        );
    });

    it("returns false for null", () => {
        expect(isMissingTableError(null, "GtfsRouteShape")).toBe(false);
    });

    it("returns false when the message mentions a different table name", () => {
        expect(
            isMissingTableError(
                new Error(`relation "OtherTable" does not exist`),
                "GtfsRouteShape",
            ),
        ).toBe(false);
    });
});

describe("isSubstituteRoute", () => {
    it("returns true for X-prefixed routes", () => {
        expect(isSubstituteRoute("X22")).toBe(true);
        expect(isSubstituteRoute("X")).toBe(true);
    });

    it("returns false for routes without X prefix", () => {
        expect(isSubstituteRoute("22")).toBe(false);
        expect(isSubstituteRoute("A")).toBe(false);
        expect(isSubstituteRoute("")).toBe(false);
    });
});

describe("isNightRoute", () => {
    it("returns true for PID night tram routes 90-99", () => {
        expect(isNightRoute("91")).toBe(true);
        expect(isNightRoute("99")).toBe(true);
        expect(isNightRoute("90")).toBe(true);
    });

    it("returns true for PID night bus routes 900-999", () => {
        expect(isNightRoute("910")).toBe(true);
        expect(isNightRoute("999")).toBe(true);
    });

    it("returns false for daytime PID routes", () => {
        expect(isNightRoute("22")).toBe(false);
        expect(isNightRoute("100")).toBe(false);
        expect(isNightRoute("89")).toBe(false);
        expect(isNightRoute("A")).toBe(false);
    });

    it("returns true for Bratislava night bus N21", () => {
        expect(isNightRoute("N21", GtfsFeedId.BRATISLAVA)).toBe(true);
    });

    it("returns true for Brno night bus N89", () => {
        expect(isNightRoute("N89", GtfsFeedId.BRNO)).toBe(true);
    });

    it("returns false for Brno daytime tram 8", () => {
        expect(isNightRoute("8", GtfsFeedId.BRNO)).toBe(false);
    });
});

describe("getVehicleTypeForRoute", () => {
    it("classifies PID metro lines A, B, C as SUBWAY", () => {
        expect(getVehicleTypeForRoute({ routeName: "A" })).toBe(
            VehicleType.SUBWAY,
        );
        expect(getVehicleTypeForRoute({ routeName: "B" })).toBe(
            VehicleType.SUBWAY,
        );
        expect(getVehicleTypeForRoute({ routeName: "C" })).toBe(
            VehicleType.SUBWAY,
        );
    });

    it("classifies PID numeric route <100 as TRAM", () => {
        expect(getVehicleTypeForRoute({ routeName: "22" })).toBe(
            VehicleType.TRAM,
        );
    });

    it("classifies PID numeric route 100+ as BUS", () => {
        expect(getVehicleTypeForRoute({ routeName: "119" })).toBe(
            VehicleType.BUS,
        );
    });

    it("classifies PID trolleybus routes 52, 58, 59 as TROLLEYBUS", () => {
        expect(getVehicleTypeForRoute({ routeName: "58" })).toBe(
            VehicleType.TROLLEYBUS,
        );
        expect(getVehicleTypeForRoute({ routeName: "59" })).toBe(
            VehicleType.TROLLEYBUS,
        );
    });

    it("classifies PID P-prefix route as FERRY", () => {
        expect(getVehicleTypeForRoute({ routeName: "P1" })).toBe(
            VehicleType.FERRY,
        );
    });

    it("classifies LD as FUNICULAR", () => {
        expect(getVehicleTypeForRoute({ routeName: "LD" })).toBe(
            VehicleType.FUNICULAR,
        );
    });

    it("classifies S-prefix and R-prefix PID routes as TRAIN", () => {
        expect(getVehicleTypeForRoute({ routeName: "S9" })).toBe(
            VehicleType.TRAIN,
        );
        expect(getVehicleTypeForRoute({ routeName: "R10" })).toBe(
            VehicleType.TRAIN,
        );
    });

    it("strips X prefix for substitute routes before classifying", () => {
        expect(getVehicleTypeForRoute({ routeName: "X22" })).toBe(
            VehicleType.TRAM,
        );
    });

    it("uses feed-aware rules for Brno trams 1-12", () => {
        expect(
            getVehicleTypeForRoute({
                feedId: GtfsFeedId.BRNO,
                routeName: "8",
            }),
        ).toBe(VehicleType.TRAM);
    });

    it("uses feed-aware rules for Brno trolleybuses 25-40", () => {
        expect(
            getVehicleTypeForRoute({
                feedId: GtfsFeedId.BRNO,
                routeName: "25",
            }),
        ).toBe(VehicleType.TROLLEYBUS);
    });

    it("uses gtfsRouteType=11 for Bratislava trolleybus when route name is ambiguous", () => {
        expect(
            getVehicleTypeForRoute({
                feedId: GtfsFeedId.BRATISLAVA,
                routeName: "201",
                gtfsRouteType: "11",
            }),
        ).toBe(VehicleType.TROLLEYBUS);
    });

    it("uses gtfsRouteType=3 for Bratislava bus when route name is ambiguous", () => {
        expect(
            getVehicleTypeForRoute({
                feedId: GtfsFeedId.BRATISLAVA,
                routeName: "201",
                gtfsRouteType: "3",
            }),
        ).toBe(VehicleType.BUS);
    });

    it("defaults to BUS for unrecognised route names", () => {
        expect(getVehicleTypeForRoute({ routeName: "ZZZ" })).toBe(
            VehicleType.BUS,
        );
    });
});
