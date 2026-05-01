import { type GeoJsonLineString, type GtfsFeedId } from "@metro-now/database";
import { z } from "zod";

import type {
    StopSnapshot,
    SyncedGtfsRouteShape,
    SyncedGtfsRouteStop,
} from "../../types/sync.types";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const agencyRowSchema = z.object({
    agency_id: z.string().min(1),
    agency_name: z.string().min(1),
});

export const routeWithAgencyRowSchema = z.object({
    route_id: z.string().min(1),
    agency_id: z.string().min(1),
    route_short_name: z.string().min(1),
    route_long_name: z.string().optional(),
    route_type: z.string().min(1),
    route_url: z.string().optional(),
    route_color: z.string().optional(),
});

export const routeRowSchema = z.object({
    route_id: z.string().min(1),
    route_short_name: z.string().min(1),
    route_long_name: z.string().optional(),
    route_type: z.string().min(1),
    route_url: z.string().optional(),
    route_color: z.string().optional(),
});

export const tripRowSchema = z.object({
    trip_id: z.string().min(1),
    route_id: z.string().min(1),
    direction_id: z.string().optional(),
});

export const stopRowSchema = z.object({
    stop_id: z.string().min(1),
    stop_name: z.string(),
    stop_lat: z.string().min(1),
    stop_lon: z.string().min(1),
    location_type: z.string().optional(),
    parent_station: z.string().optional(),
    platform_code: z.string().optional(),
});

export const stopTimeRowSchema = z.object({
    trip_id: z.string().min(1),
    stop_id: z.string().min(1),
    stop_sequence: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LOCATION_TYPE_PLATFORM = new Set(["0", "4"]);
export const LOCATION_TYPE_ENTRANCE = "2";
export const EMPTY_LOCATION_TYPE = "0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParsedStop = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    locationType: string;
    parentStationId: string | null;
    platformCode: string | null;
};

export type ParsedRoute = {
    id: string;
    shortName: string;
    longName: string | null;
    type: string;
    url: string | null;
    color: string | null;
};

export type ParsedRouteWithAgency = ParsedRoute & {
    agencyId: string;
};

export type ParsedTrip = {
    id: string;
    routeId: string;
    directionId: string;
};

export type ParsedStopTime = {
    tripId: string;
    stopId: string;
    stopSequence: number;
};

export type LogicalStop = {
    id: string;
    gtfsStopId: string;
    name: string;
    normalizedName: string;
    avgLatitude: number;
    avgLongitude: number;
    platforms: LogicalPlatform[];
    entrances: LogicalEntrance[];
};

export type LogicalPlatform = {
    id: string;
    name: string;
    code: string | null;
    latitude: number;
    longitude: number;
    stopId: string;
    routeIds: Set<string>;
};

export type LogicalEntrance = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
};

export type DominantPattern = {
    directionId: string;
    platformIds: string[];
    tripCount: number;
};

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

export const toOptionalString = (value?: string): string | null => {
    if (value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

export const normalizeStopName = (name: string): string =>
    name
        .normalize("NFD")
        .replace(/\p{Diacritic}+/gu, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

export const distanceInMeters = (
    leftLatitude: number,
    leftLongitude: number,
    rightLatitude: number,
    rightLongitude: number,
): number => {
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
    const earthRadiusMeters = 6_371_000;
    const latitudeDelta = toRadians(rightLatitude - leftLatitude);
    const longitudeDelta = toRadians(rightLongitude - leftLongitude);
    const a =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(toRadians(leftLatitude)) *
            Math.cos(toRadians(rightLatitude)) *
            Math.sin(longitudeDelta / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
};

// ---------------------------------------------------------------------------
// Row parsers
// ---------------------------------------------------------------------------

export const parseStop = (
    row: Record<string, string>,
    feedLabel: string,
): ParsedStop => {
    const parsed = stopRowSchema.parse(row);
    const latitude = Number(parsed.stop_lat);
    const longitude = Number(parsed.stop_lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error(
            `Invalid ${feedLabel} GTFS stop coordinates for '${parsed.stop_id}'`,
        );
    }

    return {
        id: parsed.stop_id,
        name: parsed.stop_name.trim(),
        latitude,
        longitude,
        locationType:
            toOptionalString(parsed.location_type) ?? EMPTY_LOCATION_TYPE,
        parentStationId: toOptionalString(parsed.parent_station),
        platformCode: toOptionalString(parsed.platform_code),
    };
};

export const parseRoute = (row: Record<string, string>): ParsedRoute => {
    const parsed = routeRowSchema.parse(row);
    return {
        id: parsed.route_id,
        shortName: parsed.route_short_name.trim(),
        longName: toOptionalString(parsed.route_long_name),
        type: parsed.route_type,
        url: toOptionalString(parsed.route_url),
        color: toOptionalString(parsed.route_color),
    };
};

export const parseRouteWithAgency = (
    row: Record<string, string>,
): ParsedRouteWithAgency => {
    const parsed = routeWithAgencyRowSchema.parse(row);
    return {
        id: parsed.route_id,
        agencyId: parsed.agency_id,
        shortName: parsed.route_short_name.trim(),
        longName: toOptionalString(parsed.route_long_name),
        type: parsed.route_type,
        url: toOptionalString(parsed.route_url),
        color: toOptionalString(parsed.route_color),
    };
};

export const parseTrip = (row: Record<string, string>): ParsedTrip => {
    const parsed = tripRowSchema.parse(row);
    return {
        id: parsed.trip_id,
        routeId: parsed.route_id,
        directionId: toOptionalString(parsed.direction_id) ?? "0",
    };
};

export const parseStopTime = (
    row: Record<string, string>,
    feedLabel: string,
): ParsedStopTime => {
    const parsed = stopTimeRowSchema.parse(row);
    const stopSequence = Number(parsed.stop_sequence);

    if (!Number.isInteger(stopSequence)) {
        throw new Error(
            `Invalid ${feedLabel} GTFS stop sequence '${parsed.stop_sequence}'`,
        );
    }

    return {
        tripId: parsed.trip_id,
        stopId: parsed.stop_id,
        stopSequence,
    };
};

// ---------------------------------------------------------------------------
// Stop-matching (for feeds that merge with PID stops)
// ---------------------------------------------------------------------------

export const matchStopsToPid = (
    pidStops: StopSnapshot["stops"],
    gtfsStops: LogicalStop[],
): Map<string, string> => {
    const localIdByGtfsId = new Map<string, string>();

    for (const pidStop of pidStops) {
        const normalizedPidName = normalizeStopName(pidStop.name);
        const matched = gtfsStops
            .filter((s) => s.normalizedName === normalizedPidName)
            .filter(
                (s) =>
                    distanceInMeters(
                        pidStop.avgLatitude,
                        pidStop.avgLongitude,
                        s.avgLatitude,
                        s.avgLongitude,
                    ) <= 250,
            )
            .sort(
                (left, right) =>
                    distanceInMeters(
                        pidStop.avgLatitude,
                        pidStop.avgLongitude,
                        left.avgLatitude,
                        left.avgLongitude,
                    ) -
                        distanceInMeters(
                            pidStop.avgLatitude,
                            pidStop.avgLongitude,
                            right.avgLatitude,
                            right.avgLongitude,
                        ) || left.id.localeCompare(right.id),
            )[0];

        if (matched) {
            localIdByGtfsId.set(matched.id, pidStop.id);
        }
    }

    return localIdByGtfsId;
};

// ---------------------------------------------------------------------------
// Logical stop construction
// ---------------------------------------------------------------------------

export const buildLogicalStops = ({
    referencedStopIds,
    stopsById,
    toStopId,
    toPlatformId,
}: {
    referencedStopIds: Set<string>;
    stopsById: Map<string, ParsedStop>;
    toStopId: (gtfsId: string) => string;
    toPlatformId: (gtfsId: string) => string;
}): LogicalStop[] => {
    const childStopsByParentId = new Map<string, ParsedStop[]>();

    for (const stop of stopsById.values()) {
        if (!stop.parentStationId) continue;
        const children = childStopsByParentId.get(stop.parentStationId) ?? [];
        children.push(stop);
        childStopsByParentId.set(stop.parentStationId, children);
    }

    const logicalStopIds = new Set<string>();

    for (const stopId of referencedStopIds) {
        const stop = stopsById.get(stopId);
        if (!stop) continue;
        logicalStopIds.add(stop.parentStationId ?? stop.id);
    }

    const logicalStops: LogicalStop[] = [];

    for (const sourceId of [...logicalStopIds].sort((a, b) =>
        a.localeCompare(b),
    )) {
        const sourceStop = stopsById.get(sourceId);
        if (!sourceStop) continue;

        const children = childStopsByParentId.get(sourceId) ?? [];
        const platformStops = children.filter((s) =>
            LOCATION_TYPE_PLATFORM.has(s.locationType),
        );
        const entranceStops = children.filter(
            (s) => s.locationType === LOCATION_TYPE_ENTRANCE,
        );
        const logicalStopId = toStopId(sourceId);
        const platformSeeds =
            platformStops.length > 0
                ? platformStops
                : LOCATION_TYPE_PLATFORM.has(sourceStop.locationType)
                  ? [sourceStop]
                  : [];

        const platforms: LogicalPlatform[] = platformSeeds
            .map((ps) => ({
                id: toPlatformId(ps.id),
                name: ps.name,
                code: ps.platformCode,
                latitude: ps.latitude,
                longitude: ps.longitude,
                stopId: logicalStopId,
                routeIds: new Set<string>(),
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        const entrances: LogicalEntrance[] = entranceStops
            .map((es) => ({
                id: es.id,
                name: es.name,
                latitude: es.latitude,
                longitude: es.longitude,
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        const coordinatePoints =
            platforms.length > 0
                ? platforms
                : entrances.length > 0
                  ? entrances
                  : [sourceStop];

        const avgLatitude =
            coordinatePoints.reduce((sum, p) => sum + p.latitude, 0) /
            coordinatePoints.length;
        const avgLongitude =
            coordinatePoints.reduce((sum, p) => sum + p.longitude, 0) /
            coordinatePoints.length;

        logicalStops.push({
            id: logicalStopId,
            gtfsStopId: sourceId,
            name: sourceStop.name,
            normalizedName: normalizeStopName(sourceStop.name),
            avgLatitude,
            avgLongitude,
            platforms,
            entrances,
        });
    }

    return logicalStops;
};

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
