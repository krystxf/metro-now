import type {
    GtfsSnapshot,
    SyncSnapshot,
    SyncedGtfsRoute,
} from "../../types/sync.types";
import type { PidSnapshot } from "../imports/pid-import.service";

export const dedupeGtfsRoutes = (
    gtfsRoutes: readonly SyncedGtfsRoute[],
): SyncedGtfsRoute[] => {
    const byKey = new Map<string, SyncedGtfsRoute>();
    for (const gtfsRoute of gtfsRoutes) {
        byKey.set(`${gtfsRoute.feedId}::${gtfsRoute.id}`, gtfsRoute);
    }
    return Array.from(byKey.values());
};

export const mergeSnapshots = (
    stopSnapshot: PidSnapshot,
    gtfsSnapshot: GtfsSnapshot,
    citySnapshots: SyncSnapshot[],
    allPlatforms: SyncSnapshot["platforms"],
): SyncSnapshot => {
    const stops = [stopSnapshot.stops];
    const platformRoutes = [stopSnapshot.platformRoutes];
    const gtfsRoutes = [stopSnapshot.gtfsRoutes, gtfsSnapshot.gtfsRoutes];
    const gtfsRouteStops = [gtfsSnapshot.gtfsRouteStops];
    const gtfsRouteShapes = [gtfsSnapshot.gtfsRouteShapes];
    const gtfsStationEntrances = [gtfsSnapshot.gtfsStationEntrances];
    const gtfsTrips = [gtfsSnapshot.gtfsTrips];
    const gtfsStopTimes = [gtfsSnapshot.gtfsStopTimes];
    const gtfsCalendars = [gtfsSnapshot.gtfsCalendars];
    const gtfsCalendarDates = [gtfsSnapshot.gtfsCalendarDates];
    const gtfsTransfers = [gtfsSnapshot.gtfsTransfers];
    const gtfsFrequencies = [gtfsSnapshot.gtfsFrequencies];

    for (const snapshot of citySnapshots) {
        stops.push(snapshot.stops);
        platformRoutes.push(snapshot.platformRoutes);
        gtfsRoutes.push(snapshot.gtfsRoutes);
        gtfsRouteStops.push(snapshot.gtfsRouteStops);
        gtfsRouteShapes.push(snapshot.gtfsRouteShapes);
        gtfsStationEntrances.push(snapshot.gtfsStationEntrances);
        gtfsTrips.push(snapshot.gtfsTrips);
        gtfsStopTimes.push(snapshot.gtfsStopTimes);
        gtfsCalendars.push(snapshot.gtfsCalendars);
        gtfsCalendarDates.push(snapshot.gtfsCalendarDates);
        gtfsTransfers.push(snapshot.gtfsTransfers);
        gtfsFrequencies.push(snapshot.gtfsFrequencies);
    }

    return {
        stops: stops.flat(),
        platforms: allPlatforms,
        platformRoutes: platformRoutes.flat(),
        gtfsRoutes: dedupeGtfsRoutes(gtfsRoutes.flat()),
        gtfsRouteStops: gtfsRouteStops.flat(),
        gtfsRouteShapes: gtfsRouteShapes.flat(),
        gtfsStationEntrances: gtfsStationEntrances.flat(),
        gtfsTrips: gtfsTrips.flat(),
        gtfsStopTimes: gtfsStopTimes.flat(),
        gtfsCalendars: gtfsCalendars.flat(),
        gtfsCalendarDates: gtfsCalendarDates.flat(),
        gtfsTransfers: gtfsTransfers.flat(),
        gtfsFrequencies: gtfsFrequencies.flat(),
    };
};
