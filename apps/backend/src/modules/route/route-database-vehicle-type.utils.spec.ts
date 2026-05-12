import { getVehicleTypeFromDatabaseType } from "src/modules/route/route-database-vehicle-type.utils";
import { VehicleType } from "src/types/graphql.generated";

describe("getVehicleTypeFromDatabaseType", () => {
    it("maps legacy METRO rows to SUBWAY", () => {
        expect(getVehicleTypeFromDatabaseType("METRO")).toBe(
            VehicleType.SUBWAY,
        );
    });

    it("maps persisted SUBWAY rows to SUBWAY", () => {
        expect(getVehicleTypeFromDatabaseType("SUBWAY")).toBe(
            VehicleType.SUBWAY,
        );
    });

    it("maps persisted TROLLEYBUS rows to TROLLEYBUS", () => {
        expect(getVehicleTypeFromDatabaseType("TROLLEYBUS")).toBe(
            VehicleType.TROLLEYBUS,
        );
    });

    it("maps BUS to BUS", () => {
        expect(getVehicleTypeFromDatabaseType("BUS")).toBe(VehicleType.BUS);
    });

    it("maps FERRY to FERRY", () => {
        expect(getVehicleTypeFromDatabaseType("FERRY")).toBe(VehicleType.FERRY);
    });

    it("maps FUNICULAR to FUNICULAR", () => {
        expect(getVehicleTypeFromDatabaseType("FUNICULAR")).toBe(
            VehicleType.FUNICULAR,
        );
    });

    it("maps TRAIN to TRAIN", () => {
        expect(getVehicleTypeFromDatabaseType("TRAIN")).toBe(VehicleType.TRAIN);
    });

    it("maps TRAM to TRAM", () => {
        expect(getVehicleTypeFromDatabaseType("TRAM")).toBe(VehicleType.TRAM);
    });

    it("returns null for null input", () => {
        expect(getVehicleTypeFromDatabaseType(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
        expect(getVehicleTypeFromDatabaseType(undefined)).toBeNull();
    });

    it("returns null for unknown string", () => {
        expect(getVehicleTypeFromDatabaseType("HOVERCRAFT")).toBeNull();
    });
});
