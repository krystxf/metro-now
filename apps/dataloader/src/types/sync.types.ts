import {
    type GeoJsonLineString,
    type GtfsFeedId,
    VehicleType,
} from "@metro-now/database";

export type SyncTrigger = "startup" | "cron" | "manual";

export type SyncedStop = {
    id: string;
    feed: GtfsFeedId;
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
    feedId: GtfsFeedId;
    shortName: string;
    longName: string | null;
    type: string;
    color: string | null;
    isNight: boolean | null;
    url: string | null;
};

export type SyncedGtfsRouteStop = {
    feedId: GtfsFeedId;
    routeId: string;
    directionId: string;
    platformId: string;
    stopSequence: number;
};

export type SyncedGtfsRouteShape = {
    feedId: GtfsFeedId;
    routeId: string;
    directionId: string;
    shapeId: string;
    tripCount: number;
    isPrimary: boolean;
    geoJson: GeoJsonLineString;
};

export type SyncedGtfsStationEntrance = {
    id: string;
    feedId: GtfsFeedId;
    stopId: string;
    parentStationId: string;
    name: string;
    latitude: number;
    longitude: number;
};

export type SyncedGtfsTrip = {
    id: string;
    feedId: GtfsFeedId;
    tripId: string;
    routeId: string;
    serviceId: string | null;
    directionId: string | null;
    shapeId: string | null;
    tripHeadsign: string | null;
    blockId: string | null;
    wheelchairAccessible: string | null;
    bikesAllowed: string | null;
    rawData: Record<string, string>;
};

export type SyncedGtfsStopTime = {
    id: string;
    feedId: GtfsFeedId;
    tripId: string;
    stopId: string;
    platformId: string | null;
    stopSequence: number;
    arrivalTime: string | null;
    departureTime: string | null;
    pickupType: string | null;
    dropOffType: string | null;
    timepoint: string | null;
    rawData: Record<string, string>;
};

export type SyncedGtfsCalendar = {
    id: string;
    feedId: GtfsFeedId;
    serviceId: string;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    startDate: string | null;
    endDate: string | null;
    rawData: Record<string, string>;
};

export type SyncedGtfsCalendarDate = {
    id: string;
    feedId: GtfsFeedId;
    serviceId: string;
    date: string;
    exceptionType: number;
    rawData: Record<string, string>;
};

export type SyncedGtfsTransfer = {
    id: string;
    feedId: GtfsFeedId;
    fromStopId: string | null;
    toStopId: string | null;
    fromRouteId: string | null;
    toRouteId: string | null;
    fromTripId: string | null;
    toTripId: string | null;
    transferType: number | null;
    minTransferTime: number | null;
    rawData: Record<string, string>;
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
    gtfsTrips: SyncedGtfsTrip[];
    gtfsStopTimes: SyncedGtfsStopTime[];
    gtfsCalendars: SyncedGtfsCalendar[];
    gtfsCalendarDates: SyncedGtfsCalendarDate[];
    gtfsTransfers: SyncedGtfsTransfer[];
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
    gtfsTrips: number;
    gtfsStopTimes: number;
    gtfsCalendars: number;
    gtfsCalendarDates: number;
    gtfsTransfers: number;
};

export type SyncRunResult = {
    status: "success" | "skipped";
    trigger: SyncTrigger;
    startedAt: Date;
    finishedAt: Date;
    durationMs: number;
    counts?: SyncCounts;
    changedEntities?: string[];
    reason?: string;
};

export type SyncPersistenceResult =
    | {
          status: "success";
          counts: SyncCounts;
          changedEntities: string[];
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
    gtfsTrips: snapshot.gtfsTrips.length,
    gtfsStopTimes: snapshot.gtfsStopTimes.length,
    gtfsCalendars: snapshot.gtfsCalendars.length,
    gtfsCalendarDates: snapshot.gtfsCalendarDates.length,
    gtfsTransfers: snapshot.gtfsTransfers.length,
});
