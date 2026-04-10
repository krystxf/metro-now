import { VehicleType } from "src/types/graphql.generated";

export const getVehicleTypeFromGtfsType = (
    routeType: string | null | undefined,
): VehicleType | null => {
    if (!routeType) {
        return null;
    }

    const numericRouteType = Number(routeType);

    if (!Number.isInteger(numericRouteType)) {
        return null;
    }

    if (numericRouteType === 0 || (numericRouteType >= 900 && numericRouteType < 1000)) {
        return VehicleType.TRAM;
    }

    if (numericRouteType === 1) {
        return VehicleType.SUBWAY;
    }

    if (
        numericRouteType === 2 ||
        (numericRouteType >= 100 && numericRouteType < 200)
    ) {
        return VehicleType.TRAIN;
    }

    if (
        numericRouteType === 3 ||
        numericRouteType === 11 ||
        (numericRouteType >= 200 && numericRouteType < 800)
    ) {
        return numericRouteType === 11 ? VehicleType.TROLLEYBUS : VehicleType.BUS;
    }

    if (numericRouteType === 4 || (numericRouteType >= 1000 && numericRouteType < 1100)) {
        return VehicleType.FERRY;
    }

    if (numericRouteType === 7 || numericRouteType === 1400) {
        return VehicleType.FUNICULAR;
    }

    return null;
};
