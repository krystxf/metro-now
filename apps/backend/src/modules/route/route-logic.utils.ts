import { GtfsFeedId } from "@metro-now/database";
import { classifyRoute } from "@metro-now/shared";

import {
    POSTGRES_UNDEFINED_TABLE,
    hasPostgresErrorCode,
} from "src/common/postgres-error.utils";
import {
    getVehicleTypeFromDatabaseType,
    getVehicleTypeFromGtfsType,
} from "src/modules/route/route-vehicle-type.utils";
import { VehicleType } from "src/types/graphql.generated";

export const CLASSIFIED_VEHICLE_TYPE_TO_GRAPHQL: Record<string, VehicleType> = {
    SUBWAY: VehicleType.SUBWAY,
    TROLLEYBUS: VehicleType.TROLLEYBUS,
    TRAM: VehicleType.TRAM,
    TRAIN: VehicleType.TRAIN,
    FERRY: VehicleType.FERRY,
    FUNICULAR: VehicleType.FUNICULAR,
    BUS: VehicleType.BUS,
};

export const isMissingTableError = (
    error: unknown,
    tableName: string,
): boolean => {
    if (hasPostgresErrorCode(error, [POSTGRES_UNDEFINED_TABLE])) {
        return true;
    }

    return (
        error instanceof Error &&
        error.message.includes(`relation "${tableName}" does not exist`)
    );
};

export const isSubstituteRoute = (routeName: string): boolean =>
    routeName.startsWith("X");

export const isNightRoute = (
    routeName: string,
    feedId: GtfsFeedId = GtfsFeedId.PID,
): boolean =>
    classifyRoute({ feedId, routeShortName: routeName }).isNight ?? false;

export const getVehicleTypeForRoute = ({
    feedId = GtfsFeedId.PID,
    routeName,
    gtfsRouteType,
}: {
    feedId?: GtfsFeedId | null;
    routeName: string;
    gtfsRouteType?: string | null;
}): VehicleType => {
    const classifiedRoute = classifyRoute({
        feedId,
        routeShortName: routeName,
        routeType: gtfsRouteType,
    });
    const classifiedVehicleType = classifiedRoute.vehicleType
        ? (CLASSIFIED_VEHICLE_TYPE_TO_GRAPHQL[classifiedRoute.vehicleType] ??
          null)
        : null;

    if (classifiedVehicleType) {
        return classifiedVehicleType;
    }

    return getVehicleTypeFromGtfsType(gtfsRouteType) ?? VehicleType.BUS;
};

export const getDatabaseVehicleType = getVehicleTypeFromDatabaseType;
