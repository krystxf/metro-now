import { type GeoJsonLineString, type GtfsFeedId } from "@metro-now/database";

import type {
    SyncedGtfsRouteShape,
    SyncedGtfsRouteStop,
} from "../../types/sync.types";
import type {
    DominantPattern,
    LogicalPlatform,
    ParsedStopTime,
    ParsedTrip,
} from "./gtfs-stop-parsers.utils";
import { parseStopTime } from "./gtfs-stop-parsers.utils";

export * from "./gtfs-stop-parsers.utils";

// ---------------------------------------------------------------------------
// Trip pattern building helpers
// ---------------------------------------------------------------------------

export const buildStopTimesByTripId = (
    rawStopTimes: Record<string, string>[],
    tripById: Map<string, ParsedTrip>,
    feedLabel: string,
): Map<string, ParsedStopTime[]> => {
    const stopTimesByTripId = new Map<string, ParsedStopTime[]>();
    for (const rawStopTime of rawStopTimes) {
        const stopTime = parseStopTime(rawStopTime, feedLabel);
        if (!tripById.has(stopTime.tripId)) continue;
        const tripStopTimes = stopTimesByTripId.get(stopTime.tripId) ?? [];
        tripStopTimes.push(stopTime);
        stopTimesByTripId.set(stopTime.tripId, tripStopTimes);
    }
    return stopTimesByTripId;
};

export const buildPatternsByRouteAndDirection = ({
    trips,
    stopTimesByTripId,
    toPlatformId,
    toRouteId,
    platformById,
}: {
    trips: ParsedTrip[];
    stopTimesByTripId: Map<string, ParsedStopTime[]>;
    toPlatformId: (gtfsId: string) => string;
    toRouteId: (gtfsId: string) => string;
    platformById: Map<string, LogicalPlatform>;
}): Map<string, Map<string, DominantPattern>> => {
    const patternsByRouteAndDirection = new Map<
        string,
        Map<string, DominantPattern>
    >();
    for (const trip of trips) {
        const tripStopTimes = (stopTimesByTripId.get(trip.id) ?? []).sort(
            (a, b) => a.stopSequence - b.stopSequence,
        );
        const platformIds = tripStopTimes
            .map((st) => toPlatformId(st.stopId))
            .filter((id) => platformById.has(id));
        if (platformIds.length === 0) continue;
        for (const platformId of platformIds) {
            platformById.get(platformId)?.routeIds.add(toRouteId(trip.routeId));
        }
        const routeDirectionKey = `${trip.routeId}::${trip.directionId}`;
        const patternKey = platformIds.join(">");
        const patterns =
            patternsByRouteAndDirection.get(routeDirectionKey) ?? new Map();
        const current = patterns.get(patternKey);
        if (current) {
            current.tripCount += 1;
        } else {
            patterns.set(patternKey, {
                directionId: trip.directionId,
                platformIds,
                tripCount: 1,
            });
        }
        patternsByRouteAndDirection.set(routeDirectionKey, patterns);
    }
    return patternsByRouteAndDirection;
};

// ---------------------------------------------------------------------------
// Route shape / stop pattern helpers
// ---------------------------------------------------------------------------

export const getDominantPattern = (
    route: { id: string },
    patternsByRouteAndDirection: Map<string, Map<string, DominantPattern>>,
): Array<{ pattern: DominantPattern }> =>
    [...patternsByRouteAndDirection.entries()]
        .filter(([key]) => key.startsWith(`${route.id}::`))
        .map(([, patterns]) => {
            const dominant = [...patterns.values()].sort(
                (left, right) =>
                    right.tripCount - left.tripCount ||
                    right.platformIds.length - left.platformIds.length ||
                    left.platformIds
                        .join(">")
                        .localeCompare(right.platformIds.join(">")),
            )[0];
            return dominant ? { pattern: dominant } : null;
        })
        .filter(
            (entry): entry is { pattern: DominantPattern } => entry !== null,
        )
        .sort((left, right) =>
            left.pattern.directionId.localeCompare(right.pattern.directionId),
        );

export const buildGtfsRouteStops = ({
    routes,
    patternsByRouteAndDirection,
    platformById,
    feedId,
    toRouteId,
}: {
    routes: Array<{ id: string }>;
    patternsByRouteAndDirection: Map<string, Map<string, DominantPattern>>;
    platformById: Map<string, LogicalPlatform>;
    feedId: GtfsFeedId;
    toRouteId: (id: string) => string;
}): SyncedGtfsRouteStop[] => {
    const routeStops: SyncedGtfsRouteStop[] = [];

    for (const route of routes) {
        for (const { pattern } of getDominantPattern(
            route,
            patternsByRouteAndDirection,
        )) {
            for (const [index, platformId] of pattern.platformIds.entries()) {
                if (!platformById.has(platformId)) continue;
                routeStops.push({
                    feedId,
                    routeId: toRouteId(route.id),
                    directionId: pattern.directionId,
                    platformId,
                    stopSequence: index,
                });
            }
        }
    }

    return routeStops;
};

export const buildGtfsRouteShapes = ({
    routes,
    patternsByRouteAndDirection,
    platformById,
    feedId,
    toRouteId,
}: {
    routes: Array<{ id: string }>;
    patternsByRouteAndDirection: Map<string, Map<string, DominantPattern>>;
    platformById: Map<string, LogicalPlatform>;
    feedId: GtfsFeedId;
    toRouteId: (id: string) => string;
}): SyncedGtfsRouteShape[] => {
    const routeShapes: SyncedGtfsRouteShape[] = [];

    for (const route of routes) {
        for (const { pattern } of getDominantPattern(
            route,
            patternsByRouteAndDirection,
        )) {
            const points = pattern.platformIds
                .map((id) => platformById.get(id))
                .filter((p): p is LogicalPlatform => p !== undefined)
                .map((p) => ({ latitude: p.latitude, longitude: p.longitude }));

            const dedupedPoints = points.filter((point, index) => {
                if (index === 0) return true;
                const prev = points[index - 1];
                return (
                    prev?.latitude !== point.latitude ||
                    prev.longitude !== point.longitude
                );
            });

            if (dedupedPoints.length < 2) continue;

            routeShapes.push({
                feedId,
                routeId: toRouteId(route.id),
                directionId: pattern.directionId,
                shapeId: `generated:${route.id}:${pattern.directionId}`,
                tripCount: pattern.tripCount,
                isPrimary: true,
                geoJson: {
                    type: "LineString",
                    coordinates: dedupedPoints.map(
                        (p): GeoJsonLineString["coordinates"][number] => [
                            p.longitude,
                            p.latitude,
                        ],
                    ),
                },
            });
        }
    }

    return routeShapes;
};
