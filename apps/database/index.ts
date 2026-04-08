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

export interface StopTable {
    id: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
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
    id: Generated<string>;
    platformId: string;
    routeId: string;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsRouteTable {
    id: string;
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
    id: Generated<string>;
    routeId: string;
    directionId: string;
    stopId: string;
    stopSequence: number;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
}

export interface GtfsStopTimeTable {
    id: Generated<string>;
    platformId: string | null;
}

export interface LogTable {
    id: Generated<string>;
    service: string;
    level: LogLevel;
    message: string;
    context: Record<string, unknown> | null;
    createdAt: Generated<Date>;
}

export interface RequestLogTable {
    id: string;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    cached: Generated<boolean>;
    userAgent: string | null;
    appVersion: string | null;
    headers: Record<string, unknown> | null;
    createdAt: Generated<Date>;
}

export interface MetroNowDatabase {
    Stop: StopTable;
    Platform: PlatformTable;
    Route: RouteTable;
    PlatformsOnRoutes: PlatformsOnRoutesTable;
    GtfsRoute: GtfsRouteTable;
    GtfsRouteStop: GtfsRouteStopTable;
    GtfsStopTime: GtfsStopTimeTable;
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
export type GtfsStopTime = Selectable<GtfsStopTimeTable>;
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
export type NewLog = Insertable<LogTable>;
export type NewRequestLog = Insertable<RequestLogTable>;
