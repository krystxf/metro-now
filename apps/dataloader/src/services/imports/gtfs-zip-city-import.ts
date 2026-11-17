import { type GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { buildGtfsPersistenceSnapshot } from "../gtfs/gtfs-persistence.utils";
import { fetchAndParseGtfsArchive } from "./gtfs-archive.utils";
import {
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

export type GtfsCityImportConfig = {
    feedId: GtfsFeedId;
    cityName: string;
    archiveUrl: string;
    stopPrefix: string;
    platformPrefix: string;
    routePrefix: string;
};

export async function importGtfsZipCity(
    config: GtfsCityImportConfig,
): Promise<SyncSnapshot> {
    const toStopId = (id: string) => `${config.stopPrefix}${id}`;
    const toPlatformId = (id: string) => `${config.platformPrefix}${id}`;
    const toRouteId = (id: string) => `${config.routePrefix}${id}`;

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
        url: config.archiveUrl,
        archiveLabel: config.cityName,
    });

    const routes = rawRoutes.map((row) => parseRoute(row));
    const routeIds = new Set(routes.map((route) => route.id));
    const trips = rawTrips
        .map((row) => parseTrip(row))
        .filter((trip) => routeIds.has(trip.routeId));
    const tripById = new Map(trips.map((trip) => [trip.id, trip] as const));

    const stopTimesByTripId = buildStopTimesByTripId(
        rawStopTimes,
        tripById,
        config.cityName,
    );

    const stopsById = new Map(
        rawStops.map((row) => {
            const stop = parseStop(row, config.cityName);
            return [stop.id, stop] as const;
        }),
    );

    const referencedStopIds = new Set<string>();
    for (const tripStopTimes of stopTimesByTripId.values()) {
        for (const stopTime of tripStopTimes) {
            referencedStopIds.add(stopTime.stopId);
        }
    }

    const logicalStops = buildLogicalStops({
        referencedStopIds,
        stopsById,
        toStopId,
        toPlatformId,
    });
    const platformById = new Map(
        logicalStops.flatMap((stop) =>
            stop.platforms.map((platform) => [platform.id, platform] as const),
        ),
    );

    const patternsByRouteAndDirection = buildPatternsByRouteAndDirection({
        trips,
        stopTimesByTripId,
        toPlatformId,
        toRouteId,
        platformById,
    });

    const stops = logicalStops.map((stop) => ({
        id: stop.id,
        feed: config.feedId,
        name: stop.name,
        avgLatitude: stop.avgLatitude,
        avgLongitude: stop.avgLongitude,
    }));

    const platforms = logicalStops.flatMap((stop) =>
        stop.platforms.map((platform) => ({
            id: platform.id,
            name: platform.name,
            code: platform.code,
            isMetro: false,
            latitude: platform.latitude,
            longitude: platform.longitude,
            stopId: stop.id,
        })),
    );

    const platformRoutes = logicalStops.flatMap((stop) =>
        stop.platforms.flatMap((platform) =>
            [...platform.routeIds].map((routeId) => ({
                platformId: platform.id,
                feedId: config.feedId,
                routeId,
            })),
        ),
    );

    const gtfsRoutes = routes.map((route) => {
        const { isNight, vehicleType } = classifyImportedRoute({
            feedId: config.feedId,
            routeShortName: route.shortName,
            routeType: route.type,
        });

        return {
            id: toRouteId(route.id),
            feedId: config.feedId,
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
            id: `${config.stopPrefix}entrance:${entrance.id}`,
            feedId: config.feedId,
            stopId: stop.id,
            parentStationId: stop.gtfsStopId,
            name: entrance.name,
            latitude: entrance.latitude,
            longitude: entrance.longitude,
        })),
    );

    const gtfsPersistenceSnapshot = buildGtfsPersistenceSnapshot({
        feedId: config.feedId,
        trips: rawTrips,
        stopTimes: rawStopTimes,
        calendars: rawCalendars,
        calendarDates: rawCalendarDates,
        transfers: rawTransfers,
        frequencies: rawFrequencies,
        mapRouteId: toRouteId,
        mapStopId: toPlatformId,
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
