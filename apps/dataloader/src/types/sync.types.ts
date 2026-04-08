import { type GeoJsonLineString, VehicleType } from "@metro-now/database";

export type SyncTrigger = "startup" | "cron" | "manual";

export type SyncedStop = {
    id: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
};

export type SyncedPlatform = {
    id: string;
    name: string;
    code: string | null;
    isMetro: boolean;
    latitude: number;
    longitude: number;
    stopId: string | null;
};

export type SyncedRoute = {
    id: string;
    name: string;
    vehicleType: VehicleType | null;
    isNight: boolean | null;
};

export type SyncedPlatformRoute = {
    platformId: string;
    routeId: string;
};

export type SyncedGtfsRoute = {
    id: string;
    shortName: string;
    longName: string | null;
    type: string;
    color: string | null;
    isNight: boolean | null;
    url: string | null;
};

export type SyncedGtfsRouteStop = {
    routeId: string;
    directionId: string;
    platformId: string;
    stopSequence: number;
};

export type SyncedGtfsRouteShape = {
    routeId: string;
    directionId: string;
    shapeId: string;
    tripCount: number;
    isPrimary: boolean;
    geoJson: GeoJsonLineString;
};

export type SyncedGtfsStationEntrance = {
    id: string;
    stopId: string;
    parentStationId: string;
    name: string;
    latitude: number;
    longitude: number;
};

export type StopSnapshot = {
    stops: SyncedStop[];
    platforms: SyncedPlatform[];
    routes: SyncedRoute[];
    platformRoutes: SyncedPlatformRoute[];
};

export type GtfsSnapshot = {
    gtfsRoutes: SyncedGtfsRoute[];
    gtfsRouteStops: SyncedGtfsRouteStop[];
    gtfsRouteShapes: SyncedGtfsRouteShape[];
    gtfsStationEntrances: SyncedGtfsStationEntrance[];
};

export type SyncSnapshot = StopSnapshot & GtfsSnapshot;

export type SyncCounts = {
    stops: number;
    platforms: number;
    routes: number;
    platformRoutes: number;
    gtfsRoutes: number;
    gtfsRouteStops: number;
    gtfsRouteShapes: number;
    gtfsStationEntrances: number;
};

export type SyncRunResult = {
    status: "success" | "skipped";
    trigger: SyncTrigger;
    startedAt: Date;
    finishedAt: Date;
    durationMs: number;
    counts?: SyncCounts;
    reason?: string;
};

export type SyncPersistenceResult =
    | {
          status: "success";
          counts: SyncCounts;
      }
    | {
          status: "skipped";
          reason: string;
      };

export const getSyncCounts = (snapshot: SyncSnapshot): SyncCounts => ({
    stops: snapshot.stops.length,
    platforms: snapshot.platforms.length,
    routes: snapshot.routes.length,
    platformRoutes: snapshot.platformRoutes.length,
    gtfsRoutes: snapshot.gtfsRoutes.length,
    gtfsRouteStops: snapshot.gtfsRouteStops.length,
    gtfsRouteShapes: snapshot.gtfsRouteShapes.length,
    gtfsStationEntrances: snapshot.gtfsStationEntrances.length,
});
