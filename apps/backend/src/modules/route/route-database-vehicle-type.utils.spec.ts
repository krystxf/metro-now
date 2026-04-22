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
});
