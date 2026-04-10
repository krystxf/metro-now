import { VehicleType } from "src/types/graphql.generated";

import { getVehicleTypeFromGtfsType } from "./route-vehicle-type.utils";

describe("getVehicleTypeFromGtfsType", () => {
    it("returns null for null input", () => {
        expect(getVehicleTypeFromGtfsType(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
        expect(getVehicleTypeFromGtfsType(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
        expect(getVehicleTypeFromGtfsType("")).toBeNull();
    });

    it("returns null for non-numeric string", () => {
        expect(getVehicleTypeFromGtfsType("abc")).toBeNull();
    });

    it("returns null for floating point number", () => {
        expect(getVehicleTypeFromGtfsType("1.5")).toBeNull();
    });

    it("returns TRAM for type 0", () => {
        expect(getVehicleTypeFromGtfsType("0")).toBe(VehicleType.TRAM);
    });

    it("returns TRAM for extended type 900", () => {
        expect(getVehicleTypeFromGtfsType("900")).toBe(VehicleType.TRAM);
    });

    it("returns TRAM for extended type 999", () => {
        expect(getVehicleTypeFromGtfsType("999")).toBe(VehicleType.TRAM);
    });

    it("returns SUBWAY for type 1", () => {
        expect(getVehicleTypeFromGtfsType("1")).toBe(VehicleType.SUBWAY);
    });

    it("returns TRAIN for type 2", () => {
        expect(getVehicleTypeFromGtfsType("2")).toBe(VehicleType.TRAIN);
    });

    it("returns TRAIN for extended type 100", () => {
        expect(getVehicleTypeFromGtfsType("100")).toBe(VehicleType.TRAIN);
    });

    it("returns TRAIN for extended type 199", () => {
        expect(getVehicleTypeFromGtfsType("199")).toBe(VehicleType.TRAIN);
    });

    it("returns BUS for type 3", () => {
        expect(getVehicleTypeFromGtfsType("3")).toBe(VehicleType.BUS);
    });

    it("returns TROLLEYBUS for type 11", () => {
        expect(getVehicleTypeFromGtfsType("11")).toBe(VehicleType.TROLLEYBUS);
    });

    it("returns BUS for extended type 200", () => {
        expect(getVehicleTypeFromGtfsType("200")).toBe(VehicleType.BUS);
    });

    it("returns BUS for extended type 799", () => {
        expect(getVehicleTypeFromGtfsType("799")).toBe(VehicleType.BUS);
    });

    it("returns FERRY for type 4", () => {
        expect(getVehicleTypeFromGtfsType("4")).toBe(VehicleType.FERRY);
    });

    it("returns FERRY for extended type 1000", () => {
        expect(getVehicleTypeFromGtfsType("1000")).toBe(VehicleType.FERRY);
    });

    it("returns FERRY for extended type 1099", () => {
        expect(getVehicleTypeFromGtfsType("1099")).toBe(VehicleType.FERRY);
    });

    it("returns FUNICULAR for type 7", () => {
        expect(getVehicleTypeFromGtfsType("7")).toBe(VehicleType.FUNICULAR);
    });

    it("returns FUNICULAR for extended type 1400", () => {
        expect(getVehicleTypeFromGtfsType("1400")).toBe(VehicleType.FUNICULAR);
    });

    it("returns null for unmapped type 5", () => {
        expect(getVehicleTypeFromGtfsType("5")).toBeNull();
    });

    it("returns null for unmapped type 6", () => {
        expect(getVehicleTypeFromGtfsType("6")).toBeNull();
    });

    it("returns null for type 1100 (not in any range)", () => {
        expect(getVehicleTypeFromGtfsType("1100")).toBeNull();
    });
});
