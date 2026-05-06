import { GtfsFeedId } from "@metro-now/database";

import { getDataloaderEnv } from "../../config/env";
import type {
    StopSnapshot,
    SyncedGtfsCalendar,
    SyncedGtfsCalendarDate,
    SyncedGtfsFrequency,
    SyncedGtfsRoute,
    SyncedGtfsRouteShape,
    SyncedGtfsRouteStop,
    SyncedGtfsStationEntrance,
    SyncedGtfsStopTime,
    SyncedGtfsTransfer,
    SyncedGtfsTrip,
} from "../../types/sync.types";
import { buildGtfsPersistenceSnapshot } from "../gtfs/gtfs-persistence.utils";
import { fetchAndParseGtfsArchive } from "./gtfs-archive.utils";
import {
    type LogicalPlatform,
    buildGtfsRouteShapes,
    buildGtfsRouteStops,
    buildLogicalStops,
    buildPatternsByRouteAndDirection,
    buildStopTimesByTripId,
    parseRoute,
    parseStop,
    parseTrip,
} from "./gtfs-complex-import.utils";
import { classifyImportedRoute } from "./route-classification.utils";

// TMB (Transports Metropolitans de Barcelona) static GTFS. Requires
// TMB_APP_ID and TMB_APP_KEY — register at https://developer.tmb.cat.
const TMB_GTFS_ARCHIVE_BASE_URL =
    "https://api.tmb.cat/v1/static/datasets/gtfs.zip";

const buildTmbGtfsUrl = (appId: string, appKey: string): string => {
    const url = new URL(TMB_GTFS_ARCHIVE_BASE_URL);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    return url.toString();
};

const TMB_STOP_PREFIX = "TMBS:";
const TMB_PLATFORM_PREFIX = "TMBP:";
const TMB_ROUTE_PREFIX = "TMBR:";

const toTmbStopId = (gtfsId: string): string => `${TMB_STOP_PREFIX}${gtfsId}`;
const toTmbPlatformId = (gtfsId: string): string =>
    `${TMB_PLATFORM_PREFIX}${gtfsId}`;
const toTmbRouteId = (gtfsId: string): string => `${TMB_ROUTE_PREFIX}${gtfsId}`;

export type TmbSnapshot = StopSnapshot & {
    gtfsRoutes: SyncedGtfsRoute[];
    gtfsRouteStops: SyncedGtfsRouteStop[];
    gtfsRouteShapes: SyncedGtfsRouteShape[];
    gtfsStationEntrances: SyncedGtfsStationEntrance[];
    gtfsTrips: SyncedGtfsTrip[];
    gtfsStopTimes: SyncedGtfsStopTime[];
    gtfsCalendars: SyncedGtfsCalendar[];
    gtfsCalendarDates: SyncedGtfsCalendarDate[];
    gtfsTransfers: SyncedGtfsTransfer[];
    gtfsFrequencies: SyncedGtfsFrequency[];
};

export class TmbImportService {
    async getTmbSnapshot(): Promise<TmbSnapshot> {
        const { tmbAppId, tmbAppKey } = getDataloaderEnv();

        if (!tmbAppId || !tmbAppKey) {
            throw new Error(
                "TMB GTFS skipped: TMB_APP_ID and TMB_APP_KEY must be set",
            );
        }

        const {
            routes: rawRoutes,
            stops: rawStops,
            stopTimes: rawStopTimes,
            trips: rawTrips,
            calendars: rawCalendars,
            calendarDates: rawCalendarDates,
            transfers: rawTransfers,
            frequencies: rawFrequencies,
        } = await fetchAndParseGtfsArchive({
            url: buildTmbGtfsUrl(tmbAppId, tmbAppKey),
            archiveLabel: "TMB",
        });

        const tmbRoutes = rawRoutes.map((row) => parseRoute(row));
        const tmbRouteIds = new Set(tmbRoutes.map((r) => r.id));
        const tmbTrips = rawTrips
            .map((row) => parseTrip(row))
            .filter((trip) => tmbRouteIds.has(trip.routeId));
        const tmbTripById = new Map(tmbTrips.map((t) => [t.id, t] as const));
        const tmbStopTimesByTripId = buildStopTimesByTripId(
            rawStopTimes,
            tmbTripById,
            "TMB",
        );

        const stopsById = new Map(
            rawStops.map((row) => {
                const stop = parseStop(row, "TMB");
                return [stop.id, stop] as const;
            }),
        );
        const referencedStopIds = new Set<string>();

        for (const tripStopTimes of tmbStopTimesByTripId.values()) {
            for (const st of tripStopTimes) {
                referencedStopIds.add(st.stopId);
            }
        }

        const logicalStops = buildLogicalStops({
            referencedStopIds,
            stopsById,
            toStopId: toTmbStopId,
            toPlatformId: toTmbPlatformId,
        });
        const platformById = new Map<string, LogicalPlatform>(
            logicalStops.flatMap((stop) =>
                stop.platforms.map((p) => [p.id, p] as const),
            ),
        );

        const patternsByRouteAndDirection = buildPatternsByRouteAndDirection({
            trips: tmbTrips,
            stopTimesByTripId: tmbStopTimesByTripId,
            toPlatformId: toTmbPlatformId,
            toRouteId: toTmbRouteId,
            platformById,
        });

        const stops = logicalStops.map((stop) => ({
            id: stop.id,
            feed: GtfsFeedId.BARCELONA,
            name: stop.name,
            avgLatitude: stop.avgLatitude,
            avgLongitude: stop.avgLongitude,
        }));

        const platforms = logicalStops.flatMap((stop) =>
            stop.platforms.map((p) => ({
                id: p.id,
                name: p.name,
                code: p.code,
                isMetro: false,
                latitude: p.latitude,
                longitude: p.longitude,
                stopId: stop.id,
            })),
        );

        const platformRoutes = logicalStops.flatMap((stop) =>
            stop.platforms.flatMap((p) =>
                [...p.routeIds].map((routeId) => ({
                    platformId: p.id,
                    feedId: GtfsFeedId.BARCELONA,
                    routeId,
                })),
            ),
        );

        const gtfsRoutes = tmbRoutes.map((route) => {
            const { isNight, vehicleType } = classifyImportedRoute({
                feedId: GtfsFeedId.BARCELONA,
                routeShortName: route.shortName,
                routeType: route.type,
            });
            return {
                id: toTmbRouteId(route.id),
                feedId: GtfsFeedId.BARCELONA,
                shortName: route.shortName,
                longName: route.longName,
                type: route.type,
                vehicleType,
                color: route.color,
                isNight,
                url: route.url,
            };
        });

        const gtfsRouteStops = buildGtfsRouteStops({
            routes: tmbRoutes,
            patternsByRouteAndDirection,
            platformById,
            feedId: GtfsFeedId.BARCELONA,
            toRouteId: toTmbRouteId,
        });

        const gtfsRouteShapes = buildGtfsRouteShapes({
            routes: tmbRoutes,
            patternsByRouteAndDirection,
            platformById,
            feedId: GtfsFeedId.BARCELONA,
            toRouteId: toTmbRouteId,
        });

        const gtfsStationEntrances = logicalStops.flatMap(
            (stop): SyncedGtfsStationEntrance[] =>
                stop.entrances.map((entrance) => ({
                    id: `${TMB_STOP_PREFIX}entrance:${entrance.id}`,
                    feedId: GtfsFeedId.BARCELONA,
                    stopId: stop.id,
                    parentStationId: stop.gtfsStopId,
                    name: entrance.name,
                    latitude: entrance.latitude,
                    longitude: entrance.longitude,
                })),
        );

        const gtfsPersistenceSnapshot = buildGtfsPersistenceSnapshot({
            feedId: GtfsFeedId.BARCELONA,
            trips: rawTrips,
            stopTimes: rawStopTimes,
            calendars: rawCalendars,
            calendarDates: rawCalendarDates,
            transfers: rawTransfers,
            frequencies: rawFrequencies,
            mapRouteId: toTmbRouteId,
            mapStopId: toTmbPlatformId,
        });

        return {
            stops,
            platforms,
            platformRoutes,
            gtfsRoutes,
            gtfsRouteStops,
            gtfsRouteShapes,
            gtfsStationEntrances,
            gtfsTrips: gtfsPersistenceSnapshot.gtfsTrips,
            gtfsStopTimes: gtfsPersistenceSnapshot.gtfsStopTimes,
            gtfsCalendars: gtfsPersistenceSnapshot.gtfsCalendars,
            gtfsCalendarDates: gtfsPersistenceSnapshot.gtfsCalendarDates,
            gtfsTransfers: gtfsPersistenceSnapshot.gtfsTransfers,
            gtfsFrequencies: gtfsPersistenceSnapshot.gtfsFrequencies,
        };
    }
}
