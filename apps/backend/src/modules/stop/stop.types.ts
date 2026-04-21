import type {
    VehicleType as DatabaseVehicleType,
    GtfsFeedId,
    GtfsRoute,
    GtfsStationEntrance,
    Platform,
    Stop,
} from "@metro-now/database";

import { VehicleType } from "src/types/graphql.generated";

export type StopRecordBase = Pick<
    Stop,
    "avgLatitude" | "avgLongitude" | "feed" | "id" | "name"
>;

export type PlatformRouteRecord = Pick<GtfsRoute, "id"> & {
    name: string;
    color: string | null;
    feed: GtfsFeedId;
    vehicleType: DatabaseVehicleType | null;
};

export type StopPlatformRecord = Pick<
    Platform,
    | "code"
    | "direction"
    | "id"
    | "isMetro"
    | "latitude"
    | "longitude"
    | "name"
    | "stopId"
> & {
    routes: PlatformRouteRecord[];
};

export type StopEntranceRecord = Pick<
    GtfsStationEntrance,
    "id" | "latitude" | "longitude" | "name"
>;

export type StopRecord = StopRecordBase & {
    entrances: StopEntranceRecord[];
    platforms: StopPlatformRecord[];
};

export type StopGraphQLPlatformRecord = Pick<Platform, "id"> &
    Partial<
        Pick<
            Platform,
            | "code"
            | "direction"
            | "isMetro"
            | "latitude"
            | "longitude"
            | "name"
            | "stopId"
        >
    > & {
        routes?: PlatformRouteRecord[];
    };

export type StopGraphQLRecord = StopRecordBase & {
    entrances: StopEntranceRecord[];
    platforms: StopGraphQLPlatformRecord[];
    isMetro: boolean;
    vehicleTypes: VehicleType[];
};

export type StopWithDistanceGraphQLRecord = StopGraphQLRecord & {
    distance: number;
};

const DATABASE_VEHICLE_TYPE_TO_GRAPHQL: Record<
    DatabaseVehicleType,
    VehicleType
> = {
    BUS: VehicleType.BUS,
    FERRY: VehicleType.FERRY,
    FUNICULAR: VehicleType.FUNICULAR,
    METRO: VehicleType.SUBWAY,
    TRAIN: VehicleType.TRAIN,
    TRAM: VehicleType.TRAM,
};

export const toGraphqlVehicleType = (
    value: DatabaseVehicleType | null | undefined,
): VehicleType | null =>
    value ? (DATABASE_VEHICLE_TYPE_TO_GRAPHQL[value] ?? null) : null;

export const toLightGraphQLStop = (
    stop: StopRecordBase,
): StopGraphQLRecord => ({
    ...stop,
    entrances: [],
    platforms: [],
    isMetro: false,
    vehicleTypes: [],
});

export const toLightGraphQLStops = (
    stops: readonly StopRecordBase[],
): StopGraphQLRecord[] => stops.map(toLightGraphQLStop);

export const getStopAggregateFromPlatforms = (
    platforms: readonly StopPlatformRecord[],
): {
    isMetro: boolean;
    vehicleTypes: VehicleType[];
} => {
    const vehicleTypes = new Set<VehicleType>();

    for (const platform of platforms) {
        for (const route of platform.routes) {
            const mappedVehicleType = toGraphqlVehicleType(route.vehicleType);

            if (mappedVehicleType) {
                vehicleTypes.add(mappedVehicleType);
            }
        }
    }

    return {
        isMetro: platforms.some((platform) => platform.isMetro),
        vehicleTypes: Array.from(vehicleTypes).sort(),
    };
};
