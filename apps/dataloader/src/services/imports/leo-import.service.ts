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

const LEO_GTFS_ARCHIVE_URL =
    "https://www.zsr.sk/files/pre-cestujucich/cestovny-poriadok/gtfs/gtfs.zip";

const LEO_STOP_PREFIX = "TLS:";
const LEO_PLATFORM_PREFIX = "TLP:";
const LEO_ROUTE_PREFIX = "LTL:";

const TARGET_AGENCY_NAMES = new Set([
    "Leo Express s.r.o.",
    "Leo Express Slovensko s.r.o.",
]);

const toLeoStopId = (gtfsId: string): string => `${LEO_STOP_PREFIX}${gtfsId}`;
const toLeoPlatformId = (gtfsId: string): string =>
    `${LEO_PLATFORM_PREFIX}${gtfsId}`;
const toLeoRouteId = (gtfsId: string): string => `${LEO_ROUTE_PREFIX}${gtfsId}`;

export type LeoSnapshot = StopSnapshot & {
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

export class LeoImportService {
    async getLeoSnapshot(
        pidStops: StopSnapshot["stops"],
    ): Promise<LeoSnapshot> {
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
            url: LEO_GTFS_ARCHIVE_URL,
            archiveLabel: "Leo",
            requireAgency: true,
        });

        const leoAgencyIds = new Set(
            rawAgencies
                .map((row) => agencyRowSchema.parse(row))
                .filter((agency) =>
                    TARGET_AGENCY_NAMES.has(agency.agency_name.trim()),
                )
                .map((agency) => agency.agency_id),
        );

        const leoRoutes = rawRoutes
            .map((row) => parseRouteWithAgency(row))
            .filter((route) => leoAgencyIds.has(route.agencyId));
        const leoRouteIds = new Set(leoRoutes.map((r) => r.id));
        const leoTrips = rawTrips
            .map((row) => parseTrip(row))
            .filter((trip) => leoRouteIds.has(trip.routeId));
        const leoTripById = new Map(leoTrips.map((t) => [t.id, t] as const));
        const leoRawTrips = rawTrips.filter((row) => {
            const routeId = row.route_id?.trim();
            return (
                routeId != null && routeId !== "" && leoRouteIds.has(routeId)
            );
        });
        const leoStopTimesByTripId = buildStopTimesByTripId(
            rawStopTimes,
            leoTripById,
            "Leo",
        );

        const stopsById = new Map(
            rawStops.map((row) => {
                const stop = parseStop(row, "Leo");
                return [stop.id, stop] as const;
            }),
        );
        const referencedStopIds = new Set<string>();

        for (const tripStopTimes of leoStopTimesByTripId.values()) {
            for (const st of tripStopTimes) {
                referencedStopIds.add(st.stopId);
            }
        }

        const logicalStops = buildLogicalStops({
            referencedStopIds,
            stopsById,
            toStopId: toLeoStopId,
            toPlatformId: toLeoPlatformId,
        });
        const platformById = new Map<string, LogicalPlatform>(
            logicalStops.flatMap((stop) =>
                stop.platforms.map((p) => [p.id, p] as const),
            ),
        );

        const patternsByRouteAndDirection = buildPatternsByRouteAndDirection({
            trips: leoTrips,
            stopTimesByTripId: leoStopTimesByTripId,
            toPlatformId: toLeoPlatformId,
            toRouteId: toLeoRouteId,
            platformById,
        });

        const localStopIdByLeoStopId = matchStopsToPid(pidStops, logicalStops);
        const matchedLeoStopIds = new Set(localStopIdByLeoStopId.keys());

        logger.info("Leo stop matching results", {
            totalLeoStops: logicalStops.length,
            matchedToLocal: matchedLeoStopIds.size,
            unmatched: logicalStops.length - matchedLeoStopIds.size,
        });

        const stops = logicalStops
            .filter((stop) => !matchedLeoStopIds.has(stop.id))
            .map((stop) => ({
                id: stop.id,
                feed: GtfsFeedId.LEO,
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
                stopId: localStopIdByLeoStopId.get(stop.id) ?? stop.id,
            })),
        );

        const platformRoutes = logicalStops.flatMap((stop) =>
            stop.platforms.flatMap((p) =>
                [...p.routeIds].map((routeId) => ({
                    platformId: p.id,
                    feedId: GtfsFeedId.LEO,
                    routeId,
                })),
            ),
        );

        const gtfsRoutes = leoRoutes.map((route) => ({
            id: toLeoRouteId(route.id),
            feedId: GtfsFeedId.LEO,
            shortName: route.shortName,
            longName: route.longName,
            type: route.type,
            vehicleType: VehicleType.TRAIN,
            color: route.color,
            isNight: false as const,
            url: route.url,
        }));

        const gtfsRouteStops = buildGtfsRouteStops({
            routes: leoRoutes,
            patternsByRouteAndDirection,
            platformById,
            feedId: GtfsFeedId.LEO,
            toRouteId: toLeoRouteId,
        });

        const gtfsRouteShapes = buildGtfsRouteShapes({
            routes: leoRoutes,
            patternsByRouteAndDirection,
            platformById,
            feedId: GtfsFeedId.LEO,
            toRouteId: toLeoRouteId,
        });

        const gtfsStationEntrances = logicalStops.flatMap((stop) =>
            stop.entrances.map((entrance) => ({
                id: entrance.id,
                feedId: GtfsFeedId.LEO,
                stopId: localStopIdByLeoStopId.get(stop.id) ?? stop.id,
                parentStationId: stop.gtfsStopId,
                name: entrance.name,
                latitude: entrance.latitude,
                longitude: entrance.longitude,
            })),
        );

        const gtfsPersistenceSnapshot = buildGtfsPersistenceSnapshot({
            feedId: GtfsFeedId.LEO,
            trips: leoRawTrips,
            stopTimes: rawStopTimes.filter((row) => {
                const tripId = row.trip_id;
                return tripId !== undefined && leoTripById.has(tripId);
            }),
            calendars: rawCalendars,
            calendarDates: rawCalendarDates,
            transfers: rawTransfers,
            frequencies: rawFrequencies,
            mapRouteId: toLeoRouteId,
            mapStopId: toLeoPlatformId,
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
