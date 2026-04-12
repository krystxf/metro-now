import {
    type ClassifiedVehicleType,
    getVehicleTypeFromGtfsRouteType,
} from "@metro-now/shared";
import { VehicleType } from "src/types/graphql.generated";

const toGraphqlVehicleType = (
    vehicleType: ClassifiedVehicleType | null,
): VehicleType | null => {
    switch (vehicleType) {
        case "BUS":
            return VehicleType.BUS;
        case "FERRY":
            return VehicleType.FERRY;
        case "FUNICULAR":
            return VehicleType.FUNICULAR;
        case "SUBWAY":
            return VehicleType.SUBWAY;
        case "TRAIN":
            return VehicleType.TRAIN;
        case "TRAM":
            return VehicleType.TRAM;
        case "TROLLEYBUS":
            return VehicleType.TROLLEYBUS;
        default:
            return null;
    }
};

export const getVehicleTypeFromGtfsType = (
    routeType: string | null | undefined,
): VehicleType | null => {
    return toGraphqlVehicleType(getVehicleTypeFromGtfsRouteType(routeType));
};
