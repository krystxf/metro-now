import type {
    Generated,
    Insertable,
    Kysely,
    Selectable,
    Transaction,
    Updateable,
} from "kysely";

export { sql } from "kysely";

export const VehicleType = {
    BUS: "BUS",
    FERRY: "FERRY",
    FUNICULAR: "FUNICULAR",
    METRO: "METRO",
    TRAIN: "TRAIN",
    TRAM: "TRAM",
} as const;

export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const LogLevel = {
    error: "error",
    info: "info",
    warn: "warn",
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export const GtfsFeedId = {
    PID: "PID",
    BRNO: "BRNO",
    BRATISLAVA: "BRATISLAVA",
    LEO: "LEO",
    LIBEREC: "LIBEREC",
    PMDP: "PMDP",
    USTI: "USTI",
    ZSR: "ZSR",
} as const;

export type GtfsFeedId = (typeof GtfsFeedId)[keyof typeof GtfsFeedId];

export type GeoJsonPosition = [number, number];

export type GeoJsonLineString = {
    type: "LineString";
    coordinates: GeoJsonPosition[];
};

export interface StopTable {
    id: string;
    feed: GtfsFeedId;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
    country: string | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface PlatformTable {
    id: string;
    name: string;
    code: string | null;
    isMetro: boolean;
    latitude: number;
    longitude: number;
    stopId: string | null;
    direction: string | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface RouteTable {
    id: string;
    name: string;
    vehicleType: VehicleType | null;
    isNight: boolean | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface PlatformsOnRoutesTable {
    id: Generated<number>;
    platformId: string;
    routeId: string;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsRouteTable {
    id: string;
    feedId: GtfsFeedId;
    type: string;
    shortName: string;
    longName: string | null;
    url: string | null;
    color: string | null;
    isNight: boolean | null;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsRouteStopTable {
    id: Generated<number>;
    feedId: GtfsFeedId;
    routeId: string;
    directionId: string;
    stopId: string;
    stopSequence: number;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsRouteShapeTable {
    id: Generated<number>;
    feedId: GtfsFeedId;
    routeId: string;
    directionId: string;
    shapeId: string;
    tripCount: number;
    isPrimary: boolean;
    geoJson: GeoJsonLineString;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsStationEntranceTable {
    id: string;
    feedId: GtfsFeedId;
    stopId: string;
    parentStationId: string;
    name: string;
    latitude: number;
    longitude: number;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsTripTable {
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
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsStopTimeTable {
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
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsCalendarTable {
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
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsCalendarDateTable {
    id: string;
    feedId: GtfsFeedId;
    serviceId: string;
    date: string;
    exceptionType: number;
    rawData: Record<string, string>;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsTransferTable {
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
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface LogTable {
    id: Generated<number>;
    service: string;
    level: LogLevel;
    message: string;
    context: Record<string, unknown> | null;
    createdAt: Generated<Date>;
}

export interface RequestLogTable {
    id: Generated<number>;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    cached: Generated<boolean>;
    userAgent: string | null;
    appVersion: string | null;
    headers: Record<string, unknown> | null;
    graphqlQuery: string | null;
    createdAt: Generated<Date>;
}

export interface MetroNowDatabase {
    Stop: StopTable;
    Platform: PlatformTable;
    Route: RouteTable;
    PlatformsOnRoutes: PlatformsOnRoutesTable;
    GtfsRoute: GtfsRouteTable;
    GtfsRouteStop: GtfsRouteStopTable;
    GtfsRouteShape: GtfsRouteShapeTable;
    GtfsStationEntrance: GtfsStationEntranceTable;
    GtfsTrip: GtfsTripTable;
    GtfsStopTime: GtfsStopTimeTable;
    GtfsCalendar: GtfsCalendarTable;
    GtfsCalendarDate: GtfsCalendarDateTable;
    GtfsTransfer: GtfsTransferTable;
    Log: LogTable;
    RequestLog: RequestLogTable;
}

export type DatabaseClient = Kysely<MetroNowDatabase>;
export type DatabaseTransaction = Transaction<MetroNowDatabase>;

export type Stop = Selectable<StopTable>;
export type Platform = Selectable<PlatformTable>;
export type Route = Selectable<RouteTable>;
export type PlatformsOnRoutes = Selectable<PlatformsOnRoutesTable>;
export type GtfsRoute = Selectable<GtfsRouteTable>;
export type GtfsRouteStop = Selectable<GtfsRouteStopTable>;
export type GtfsRouteShape = Selectable<GtfsRouteShapeTable>;
export type GtfsStationEntrance = Selectable<GtfsStationEntranceTable>;
export type GtfsTrip = Selectable<GtfsTripTable>;
export type GtfsStopTime = Selectable<GtfsStopTimeTable>;
export type GtfsCalendar = Selectable<GtfsCalendarTable>;
export type GtfsCalendarDate = Selectable<GtfsCalendarDateTable>;
export type GtfsTransfer = Selectable<GtfsTransferTable>;
export type Log = Selectable<LogTable>;
export type RequestLog = Selectable<RequestLogTable>;

export type NewStop = Insertable<StopTable>;
export type StopUpdate = Updateable<StopTable>;
export type NewPlatform = Insertable<PlatformTable>;
export type PlatformUpdate = Updateable<PlatformTable>;
export type NewRoute = Insertable<RouteTable>;
export type RouteUpdate = Updateable<RouteTable>;
export type NewPlatformsOnRoutes = Insertable<PlatformsOnRoutesTable>;
export type NewGtfsRoute = Insertable<GtfsRouteTable>;
export type GtfsRouteUpdate = Updateable<GtfsRouteTable>;
export type NewGtfsRouteStop = Insertable<GtfsRouteStopTable>;
export type NewGtfsRouteShape = Insertable<GtfsRouteShapeTable>;
export type NewGtfsStationEntrance = Insertable<GtfsStationEntranceTable>;
export type NewGtfsTrip = Insertable<GtfsTripTable>;
export type NewGtfsStopTime = Insertable<GtfsStopTimeTable>;
export type NewGtfsCalendar = Insertable<GtfsCalendarTable>;
export type NewGtfsCalendarDate = Insertable<GtfsCalendarDateTable>;
export type NewGtfsTransfer = Insertable<GtfsTransferTable>;
export type NewLog = Insertable<LogTable>;
export type NewRequestLog = Insertable<RequestLogTable>;
