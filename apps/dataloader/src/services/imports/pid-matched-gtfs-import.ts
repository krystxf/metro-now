import { type GtfsFeedId, VehicleType } from "@metro-now/database";

import type { StopSnapshot, SyncSnapshot } from "../../types/sync.types";
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

export type PidMatchedGtfsImportConfig = {
    url: string;
    archiveLabel: string;
    feedId: GtfsFeedId;
    stopPrefix: string;
    platformPrefix: string;
    routePrefix: string;
    includeAgency: (agencyName: string) => boolean;
    prefixEntranceId?: boolean;
};

export async function importPidMatchedGtfsFeed(
    config: PidMatchedGtfsImportConfig,
    pidStops: StopSnapshot["stops"],
): Promise<SyncSnapshot> {
    const toStopId = (id: string) => `${config.stopPrefix}${id}`;
    const toPlatformId = (id: string) => `${config.platformPrefix}${id}`;
    const toRouteId = (id: string) => `${config.routePrefix}${id}`;
    const prefixEntranceId = config.prefixEntranceId ?? true;

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
        url: config.url,
        archiveLabel: config.archiveLabel,
        requireAgency: true,
    });

    const includedAgencyIds = new Set(
        rawAgencies
            .map((row) => agencyRowSchema.parse(row))
            .filter((agency) => config.includeAgency(agency.agency_name.trim()))
            .map((agency) => agency.agency_id),
    );

    logger.info(`${config.archiveLabel} agency filtering`, {
        totalAgencies: rawAgencies.length,
        includedAgencies: includedAgencyIds.size,
    });

    const routes = rawRoutes
        .map((row) => parseRouteWithAgency(row))
        .filter((route) => includedAgencyIds.has(route.agencyId));
    const routeIds = new Set(routes.map((r) => r.id));
    const trips = rawTrips
        .map((row) => parseTrip(row))
        .filter((trip) => routeIds.has(trip.routeId));
    const tripById = new Map(trips.map((t) => [t.id, t] as const));
    const filteredRawTrips = rawTrips.filter((row) => {
        const routeId = row.route_id?.trim();
        return routeId != null && routeId !== "" && routeIds.has(routeId);
    });
    const stopTimesByTripId = buildStopTimesByTripId(
        rawStopTimes,
        tripById,
        config.archiveLabel,
    );

    const stopsById = new Map(
        rawStops.map((row) => {
            const stop = parseStop(row, config.archiveLabel);
            return [stop.id, stop] as const;
        }),
    );
    const referencedStopIds = new Set<string>();

    for (const tripStopTimes of stopTimesByTripId.values()) {
        for (const st of tripStopTimes) {
            referencedStopIds.add(st.stopId);
        }
    }

    const logicalStops = buildLogicalStops({
        referencedStopIds,
        stopsById,
        toStopId,
        toPlatformId,
    });
    const platformById = new Map<string, LogicalPlatform>(
        logicalStops.flatMap((stop) =>
            stop.platforms.map((p) => [p.id, p] as const),
        ),
    );

    const patternsByRouteAndDirection = buildPatternsByRouteAndDirection({
        trips,
        stopTimesByTripId,
        toPlatformId,
        toRouteId,
        platformById,
    });

    const localStopIdByFeedStopId = matchStopsToPid(pidStops, logicalStops);
    const matchedFeedStopIds = new Set(localStopIdByFeedStopId.keys());

    logger.info(`${config.archiveLabel} stop matching results`, {
        totalStops: logicalStops.length,
        matchedToLocal: matchedFeedStopIds.size,
        unmatched: logicalStops.length - matchedFeedStopIds.size,
    });

    const stops = logicalStops
        .filter((stop) => !matchedFeedStopIds.has(stop.id))
        .map((stop) => ({
            id: stop.id,
            feed: config.feedId,
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
            stopId: localStopIdByFeedStopId.get(stop.id) ?? stop.id,
        })),
    );

    const platformRoutes = logicalStops.flatMap((stop) =>
        stop.platforms.flatMap((p) =>
            [...p.routeIds].map((routeId) => ({
                platformId: p.id,
                feedId: config.feedId,
                routeId,
            })),
        ),
    );

    const gtfsRoutes = routes.map((route) => ({
        id: toRouteId(route.id),
        feedId: config.feedId,
        shortName: route.shortName,
        longName: route.longName,
        type: route.type,
        vehicleType: VehicleType.TRAIN,
        color: route.color,
        isNight: false as const,
        url: route.url,
    }));

    const gtfsRouteStops = buildGtfsRouteStops({
        routes,
        patternsByRouteAndDirection,
        platformById,
        feedId: config.feedId,
        toRouteId,
    });

    const gtfsRouteShapes = buildGtfsRouteShapes({
        routes,
        patternsByRouteAndDirection,
        platformById,
        feedId: config.feedId,
        toRouteId,
    });

    const gtfsStationEntrances = logicalStops.flatMap((stop) =>
        stop.entrances.map((entrance) => ({
            id: prefixEntranceId
                ? `${config.stopPrefix}entrance:${entrance.id}`
                : entrance.id,
            feedId: config.feedId,
            stopId: localStopIdByFeedStopId.get(stop.id) ?? stop.id,
            parentStationId: stop.gtfsStopId,
            name: entrance.name,
            latitude: entrance.latitude,
            longitude: entrance.longitude,
        })),
    );

    const gtfsPersistenceSnapshot = buildGtfsPersistenceSnapshot({
        feedId: config.feedId,
        trips: filteredRawTrips,
        stopTimes: rawStopTimes.filter((row) => {
            const tripId = row.trip_id;
            return tripId !== undefined && tripById.has(tripId);
        }),
        calendars: rawCalendars,
        calendarDates: rawCalendarDates,
        transfers: rawTransfers,
        frequencies: rawFrequencies,
        mapRouteId: toRouteId,
        mapStopId: toPlatformId,
    });

    logger.info(`${config.archiveLabel} snapshot built`, {
        routes: routes.length,
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
