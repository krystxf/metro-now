import { type VehicleType as DatabaseVehicleType } from "@metro-now/database";

import { VehicleType } from "src/types/graphql.generated";

const DATABASE_VEHICLE_TYPE_TO_GRAPHQL: Partial<
    Record<DatabaseVehicleType | string, VehicleType>
> = {
    BUS: VehicleType.BUS,
    FERRY: VehicleType.FERRY,
    FUNICULAR: VehicleType.FUNICULAR,
    METRO: VehicleType.SUBWAY,
    SUBWAY: VehicleType.SUBWAY,
    TRAIN: VehicleType.TRAIN,
    TRAM: VehicleType.TRAM,
    TROLLEYBUS: VehicleType.TROLLEYBUS,
};

export const getVehicleTypeFromDatabaseType = (
    vehicleType: DatabaseVehicleType | string | null | undefined,
): VehicleType | null =>
    vehicleType
        ? (DATABASE_VEHICLE_TYPE_TO_GRAPHQL[vehicleType] ?? null)
        : null;
