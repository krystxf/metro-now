import { type GtfsFeedId, VehicleType } from "@metro-now/database";
import { type ClassifiedVehicleType, classifyRoute } from "@metro-now/shared";

const toDatabaseVehicleType = (
    vehicleType: ClassifiedVehicleType | null,
): VehicleType | null => {
    switch (vehicleType) {
        case "BUS":
        case "TROLLEYBUS":
            return VehicleType.BUS;
        case "FERRY":
            return VehicleType.FERRY;
        case "FUNICULAR":
            return VehicleType.FUNICULAR;
        case "SUBWAY":
            return VehicleType.METRO;
        case "TRAIN":
            return VehicleType.TRAIN;
        case "TRAM":
            return VehicleType.TRAM;
        default:
            return null;
    }
};

export const classifyImportedRoute = ({
    feedId,
    routeShortName,
    routeType,
}: {
    feedId: GtfsFeedId;
    routeShortName: string | null | undefined;
    routeType?: string | null;
}): {
    vehicleType: VehicleType | null;
    isNight: boolean | null;
} => {
    const classifiedRoute = classifyRoute({
        feedId,
        routeShortName,
        routeType,
    });

    return {
        vehicleType: toDatabaseVehicleType(classifiedRoute.vehicleType),
        isNight: classifiedRoute.isNight,
    };
};
