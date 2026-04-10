export type LeoPlatformRoute = {
    id: string;
    name: string;
};

export type LeoPlatform = {
    id: string;
    latitude: number;
    longitude: number;
    name: string;
    isMetro: false;
    code: string | null;
    stopId: string;
    routes: LeoPlatformRoute[];
};

export type LeoStopEntrance = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
};

export type LeoStop = {
    id: string;
    gtfsStopId: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
    normalizedName: string;
    platforms: LeoPlatform[];
    entrances: LeoStopEntrance[];
};

export type LeoRouteDirection = {
    id: string;
    platforms: Array<
        Pick<
            LeoPlatform,
            "code" | "id" | "isMetro" | "latitude" | "longitude" | "name"
        >
    >;
};

export type LeoRouteShapePoint = {
    latitude: number;
    longitude: number;
};

export type LeoRouteShape = {
    id: string;
    directionId: string;
    tripCount: number;
    geoJson: string;
    points: LeoRouteShapePoint[];
};

export type LeoRoute = {
    id: string;
    shortName: string;
    longName: string | null;
    color: string | null;
    url: string | null;
    type: string;
    directions: LeoRouteDirection[];
    shapes: LeoRouteShape[];
};

export type LeoCatalog = {
    routes: LeoRoute[];
    stops: LeoStop[];
};
