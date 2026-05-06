import { GtfsFeedId, VehicleType } from "@metro-now/database";

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
import { logger } from "../../utils/logger";
import { buildGtfsPersistenceSnapshot } from "../gtfs/gtfs-persistence.utils";
import { fetchAndParseGtfsArchive } from "./gtfs-archive.utils";
import {
    type LogicalPlatform,
    agencyRowSchema,
    buildGtfsRouteShapes,
    buildGtfsRouteStops,
    buildLogicalStops,
    buildPatternsByRouteAndDirection,
    buildStopTimesByTripId,
    matchStopsToPid,
    parseRouteWithAgency,
    parseStop,
    parseTrip,
} from "./gtfs-complex-import.utils";

const ZSR_GTFS_ARCHIVE_URL =
    "https://www.zsr.sk/files/pre-cestujucich/cestovny-poriadok/gtfs/gtfs.zip";

const ZSR_STOP_PREFIX = "ZRS:";
const ZSR_PLATFORM_PREFIX = "ZRP:";
const ZSR_ROUTE_PREFIX = "ZRR:";

const LEO_AGENCY_NAMES = new Set([
    "Leo Express s.r.o.",
    "Leo Express Slovensko s.r.o.",
]);

const toZsrStopId = (gtfsId: string): string => `${ZSR_STOP_PREFIX}${gtfsId}`;
const toZsrPlatformId = (gtfsId: string): string =>
    `${ZSR_PLATFORM_PREFIX}${gtfsId}`;
const toZsrRouteId = (gtfsId: string): string => `${ZSR_ROUTE_PREFIX}${gtfsId}`;

export type ZsrSnapshot = StopSnapshot & {
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

export class ZsrImportService {
    async getZsrSnapshot(
        pidStops: StopSnapshot["stops"],
    ): Promise<ZsrSnapshot> {
        const {
            agencies: rawAgencies,
            routes: rawRoutes,
            stops: rawStops,
            stopTimes: rawStopTimes,
            trips: rawTrips,
            calendars: rawCalendars,
            calendarDates: rawCalendarDates,
            transfers: rawTransfers,
            frequencies: rawFrequencies,
        } = await fetchAndParseGtfsArchive({
            url: ZSR_GTFS_ARCHIVE_URL,
            archiveLabel: "ZSR",
            requireAgency: true,
        });

        // Filter out Leo Express agencies — their data comes via the leo-import service
        const nonLeoAgencyIds = new Set(
            rawAgencies
                .map((row) => agencyRowSchema.parse(row))
                .filter(
                    (agency) =>
                        !LEO_AGENCY_NAMES.has(agency.agency_name.trim()),
                )
                .map((agency) => agency.agency_id),
        );

        logger.info("ZSR agency filtering", {
            totalAgencies: rawAgencies.length,
            nonLeoAgencies: nonLeoAgencyIds.size,
        });

        const zsrRoutes = rawRoutes
            .map((row) => parseRouteWithAgency(row))
            .filter((route) => nonLeoAgencyIds.has(route.agencyId));
        const zsrRouteIds = new Set(zsrRoutes.map((r) => r.id));
        const zsrTrips = rawTrips
            .map((row) => parseTrip(row))
            .filter((trip) => zsrRouteIds.has(trip.routeId));
        const zsrTripById = new Map(zsrTrips.map((t) => [t.id, t] as const));
        const zsrRawTrips = rawTrips.filter((row) => {
            const routeId = row.route_id?.trim();
            return (
                routeId != null && routeId !== "" && zsrRouteIds.has(routeId)
            );
        });
        const zsrStopTimesByTripId = buildStopTimesByTripId(
            rawStopTimes,
            zsrTripById,
            "ZSR",
        );

        const stopsById = new Map(
            rawStops.map((row) => {
                const stop = parseStop(row, "ZSR");
                return [stop.id, stop] as const;
            }),
        );
        const referencedStopIds = new Set<string>();

        for (const tripStopTimes of zsrStopTimesByTripId.values()) {
            for (const st of tripStopTimes) {
                referencedStopIds.add(st.stopId);
            }
        }

        const logicalStops = buildLogicalStops({
            referencedStopIds,
            stopsById,
            toStopId: toZsrStopId,
            toPlatformId: toZsrPlatformId,
        });
        const platformById = new Map<string, LogicalPlatform>(
            logicalStops.flatMap((stop) =>
                stop.platforms.map((p) => [p.id, p] as const),
            ),
        );

        const patternsByRouteAndDirection = buildPatternsByRouteAndDirection({
            trips: zsrTrips,
            stopTimesByTripId: zsrStopTimesByTripId,
            toPlatformId: toZsrPlatformId,
            toRouteId: toZsrRouteId,
            platformById,
        });

        const localStopIdByZsrStopId = matchStopsToPid(pidStops, logicalStops);
        const matchedZsrStopIds = new Set(localStopIdByZsrStopId.keys());

        logger.info("ZSR stop matching results", {
            totalZsrStops: logicalStops.length,
            matchedToLocal: matchedZsrStopIds.size,
            unmatched: logicalStops.length - matchedZsrStopIds.size,
        });

        const stops = logicalStops
            .filter((stop) => !matchedZsrStopIds.has(stop.id))
            .map((stop) => ({
                id: stop.id,
                feed: GtfsFeedId.ZSR,
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
                stopId: localStopIdByZsrStopId.get(stop.id) ?? stop.id,
            })),
        );

        const platformRoutes = logicalStops.flatMap((stop) =>
            stop.platforms.flatMap((p) =>
                [...p.routeIds].map((routeId) => ({
                    platformId: p.id,
                    feedId: GtfsFeedId.ZSR,
                    routeId,
                })),
            ),
        );

        const gtfsRoutes = zsrRoutes.map((route) => ({
            id: toZsrRouteId(route.id),
            feedId: GtfsFeedId.ZSR,
            shortName: route.shortName,
            longName: route.longName,
            type: route.type,
            vehicleType: VehicleType.TRAIN,
            color: route.color,
            isNight: false as const,
            url: route.url,
        }));

        const gtfsRouteStops = buildGtfsRouteStops({
            routes: zsrRoutes,
            patternsByRouteAndDirection,
            platformById,
            feedId: GtfsFeedId.ZSR,
            toRouteId: toZsrRouteId,
        });

        const gtfsRouteShapes = buildGtfsRouteShapes({
            routes: zsrRoutes,
            patternsByRouteAndDirection,
            platformById,
            feedId: GtfsFeedId.ZSR,
            toRouteId: toZsrRouteId,
        });

        const gtfsStationEntrances = logicalStops.flatMap((stop) =>
            stop.entrances.map((entrance) => ({
                id: `${ZSR_STOP_PREFIX}entrance:${entrance.id}`,
                feedId: GtfsFeedId.ZSR,
                stopId: localStopIdByZsrStopId.get(stop.id) ?? stop.id,
                parentStationId: stop.gtfsStopId,
                name: entrance.name,
                latitude: entrance.latitude,
                longitude: entrance.longitude,
            })),
        );

        const zsrRawStopTimes = rawStopTimes.filter((row) => {
            const tripId = row.trip_id;
            return tripId !== undefined && zsrTripById.has(tripId);
        });

        const gtfsPersistenceSnapshot = buildGtfsPersistenceSnapshot({
            feedId: GtfsFeedId.ZSR,
            trips: zsrRawTrips,
            stopTimes: zsrRawStopTimes,
            calendars: rawCalendars,
            calendarDates: rawCalendarDates,
            transfers: rawTransfers,
            frequencies: rawFrequencies,
            mapRouteId: toZsrRouteId,
            mapStopId: toZsrPlatformId,
        });

        logger.info("ZSR snapshot built", {
            routes: zsrRoutes.length,
            stops: stops.length,
            platforms: platforms.length,
            trips: gtfsPersistenceSnapshot.gtfsTrips.length,
            stopTimes: gtfsPersistenceSnapshot.gtfsStopTimes.length,
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
