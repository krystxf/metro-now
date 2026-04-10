import { parseString } from "@fast-csv/parse";
import { z } from "zod";

import {
    toLeoPlatformId,
    toLeoRouteId,
    toLeoStopId,
} from "src/modules/leo/leo-id.utils";
import type {
    LeoCatalog,
    LeoPlatform,
    LeoPlatformRoute,
    LeoRoute,
    LeoStop,
    LeoStopEntrance,
} from "src/modules/leo/leo.types";

const TARGET_AGENCY_NAMES = new Set([
    "Leo Express s.r.o.",
    "Leo Express Slovensko s.r.o.",
]);

const EMPTY_LOCATION_TYPE = "0";
const LOCATION_TYPE_PLATFORM = new Set(["0", "4"]);
const LOCATION_TYPE_ENTRANCE = "2";

const agencyRowSchema = z.object({
    agency_id: z.string().min(1),
    agency_name: z.string().min(1),
});

const routeRowSchema = z.object({
    route_id: z.string().min(1),
    agency_id: z.string().min(1),
    route_short_name: z.string().min(1),
    route_long_name: z.string().optional(),
    route_type: z.string().min(1),
    route_url: z.string().optional(),
    route_color: z.string().optional(),
});

const tripRowSchema = z.object({
    trip_id: z.string().min(1),
    route_id: z.string().min(1),
    trip_headsign: z.string().optional(),
    trip_short_name: z.string().optional(),
    direction_id: z.string().optional(),
});

const stopRowSchema = z.object({
    stop_id: z.string().min(1),
    stop_name: z.string(),
    stop_lat: z.string().min(1),
    stop_lon: z.string().min(1),
    location_type: z.string().optional(),
    parent_station: z.string().optional(),
    platform_code: z.string().optional(),
});

const stopTimeRowSchema = z.object({
    trip_id: z.string().min(1),
    stop_id: z.string().min(1),
    stop_sequence: z.string().min(1),
});

type AgencyRow = z.infer<typeof agencyRowSchema>;
type RouteRow = z.infer<typeof routeRowSchema>;
type TripRow = z.infer<typeof tripRowSchema>;
type StopRow = z.infer<typeof stopRowSchema>;
type StopTimeRow = z.infer<typeof stopTimeRowSchema>;

type ParsedStop = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    locationType: string;
    parentStationId: string | null;
    platformCode: string | null;
};

type ParsedRoute = {
    id: string;
    agencyId: string;
    shortName: string;
    longName: string | null;
    type: string;
    url: string | null;
    color: string | null;
};

type ParsedTrip = {
    id: string;
    routeId: string;
    headsign: string | null;
    shortName: string | null;
    directionId: string;
};

type ParsedStopTime = {
    tripId: string;
    stopId: string;
    stopSequence: number;
};

type DominantPattern = {
    directionId: string;
    platformIds: string[];
    tripCount: number;
};

const parseCsvString = async <Row>(csvString: string): Promise<Row[]> => {
    return await new Promise<Row[]>((resolve, reject) => {
        const rows: Row[] = [];

        parseString(csvString, { headers: true, trim: true })
            .on("error", (error) => reject(error))
            .on("data", (row) => rows.push(row))
            .on("end", () => resolve(rows));
    });
};

const toOptionalString = (value?: string): string | null => {
    if (value === undefined) {
        return null;
    }

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

const parseStop = (row: StopRow): ParsedStop => {
    const parsed = stopRowSchema.parse(row);
    const latitude = Number(parsed.stop_lat);
    const longitude = Number(parsed.stop_lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error(
            `Invalid Leo GTFS stop coordinates for '${parsed.stop_id}'`,
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

const parseRoute = (row: RouteRow): ParsedRoute => {
    const parsed = routeRowSchema.parse(row);

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

const parseTrip = (row: TripRow): ParsedTrip => {
    const parsed = tripRowSchema.parse(row);

    return {
        id: parsed.trip_id,
        routeId: parsed.route_id,
        headsign: toOptionalString(parsed.trip_headsign),
        shortName: toOptionalString(parsed.trip_short_name),
        directionId: toOptionalString(parsed.direction_id) ?? "0",
    };
};

const parseStopTime = (row: StopTimeRow): ParsedStopTime => {
    const parsed = stopTimeRowSchema.parse(row);
    const stopSequence = Number(parsed.stop_sequence);

    if (!Number.isInteger(stopSequence)) {
        throw new Error(
            `Invalid Leo GTFS stop sequence '${parsed.stop_sequence}'`,
        );
    }

    return {
        tripId: parsed.trip_id,
        stopId: parsed.stop_id,
        stopSequence,
    };
};

const sortPlatformIds = (
    left: Pick<LeoPlatform, "id">,
    right: Pick<LeoPlatform, "id">,
) => left.id.localeCompare(right.id);

const toGeoJsonString = (points: Array<[number, number]>): string =>
    JSON.stringify({
        type: "LineString",
        coordinates: points,
    });

const buildLogicalStops = ({
    referencedStopIds,
    stopsById,
}: {
    referencedStopIds: Set<string>;
    stopsById: Map<string, ParsedStop>;
}): {
    logicalStops: LeoStop[];
    platformById: Map<string, LeoPlatform>;
    publicStopIdByPlatformId: Map<string, string>;
} => {
    const childStopsByParentId = new Map<string, ParsedStop[]>();

    for (const stop of stopsById.values()) {
        if (!stop.parentStationId) {
            continue;
        }

        const children = childStopsByParentId.get(stop.parentStationId) ?? [];

        children.push(stop);
        childStopsByParentId.set(stop.parentStationId, children);
    }

    const logicalStopIds = new Set<string>();

    for (const stopId of referencedStopIds) {
        const stop = stopsById.get(stopId);

        if (!stop) {
            continue;
        }

        logicalStopIds.add(stop.parentStationId ?? stop.id);
    }

    const logicalStops: LeoStop[] = [];
    const platformById = new Map<string, LeoPlatform>();
    const publicStopIdByPlatformId = new Map<string, string>();

    for (const logicalStopSourceId of [...logicalStopIds].sort((a, b) =>
        a.localeCompare(b),
    )) {
        const sourceStop = stopsById.get(logicalStopSourceId);

        if (!sourceStop) {
            continue;
        }

        const children = childStopsByParentId.get(logicalStopSourceId) ?? [];
        const platformStops = children.filter((stop) =>
            LOCATION_TYPE_PLATFORM.has(stop.locationType),
        );
        const entranceStops = children.filter(
            (stop) => stop.locationType === LOCATION_TYPE_ENTRANCE,
        );
        const logicalStopId = toLeoStopId(logicalStopSourceId);
        const platformSeeds =
            platformStops.length > 0
                ? platformStops
                : LOCATION_TYPE_PLATFORM.has(sourceStop.locationType)
                  ? [sourceStop]
                  : [];

        const platforms = platformSeeds
            .map<LeoPlatform>((platformStop) => ({
                id: toLeoPlatformId(platformStop.id),
                latitude: platformStop.latitude,
                longitude: platformStop.longitude,
                name: platformStop.name,
                isMetro: false,
                code: platformStop.platformCode,
                stopId: logicalStopId,
                routes: [],
            }))
            .sort(sortPlatformIds);
        const entrances = entranceStops
            .map<LeoStopEntrance>((entranceStop) => ({
                id: entranceStop.id,
                name: entranceStop.name,
                latitude: entranceStop.latitude,
                longitude: entranceStop.longitude,
            }))
            .sort((left, right) => left.id.localeCompare(right.id));
        const coordinatePoints =
            platforms.length > 0
                ? platforms.map((platform) => ({
                      latitude: platform.latitude,
                      longitude: platform.longitude,
                  }))
                : entrances.length > 0
                  ? entrances
                  : [
                        {
                            latitude: sourceStop.latitude,
                            longitude: sourceStop.longitude,
                        },
                    ];
        const avgLatitude =
            coordinatePoints.reduce((sum, point) => sum + point.latitude, 0) /
            coordinatePoints.length;
        const avgLongitude =
            coordinatePoints.reduce((sum, point) => sum + point.longitude, 0) /
            coordinatePoints.length;

        for (const platform of platforms) {
            platformById.set(platform.id, platform);
            publicStopIdByPlatformId.set(platform.id, logicalStopId);
        }

        logicalStops.push({
            id: logicalStopId,
            gtfsStopId: logicalStopSourceId,
            name: sourceStop.name,
            avgLatitude,
            avgLongitude,
            normalizedName: normalizeStopName(sourceStop.name),
            platforms,
            entrances,
        });
    }

    return {
        logicalStops,
        platformById,
        publicStopIdByPlatformId,
    };
};

const chooseDominantPattern = (
    patterns: Map<string, DominantPattern>,
): DominantPattern | null => {
    const values = [...patterns.values()];

    if (values.length === 0) {
        return null;
    }

    return values.sort((left, right) => {
        return (
            right.tripCount - left.tripCount ||
            right.platformIds.length - left.platformIds.length ||
            left.platformIds
                .join(">")
                .localeCompare(right.platformIds.join(">"))
        );
    })[0]!;
};

export const buildLeoCatalogFromCsv = ({
    agenciesCsv,
    routesCsv,
    stopsCsv,
    stopTimesCsv,
    tripsCsv,
}: {
    agenciesCsv: string;
    routesCsv: string;
    stopsCsv: string;
    stopTimesCsv: string;
    tripsCsv: string;
}): Promise<LeoCatalog> =>
    (async () => {
        const [agencies, routes, stops, stopTimes, trips] = await Promise.all([
            parseCsvString<AgencyRow>(agenciesCsv),
            parseCsvString<RouteRow>(routesCsv),
            parseCsvString<StopRow>(stopsCsv),
            parseCsvString<StopTimeRow>(stopTimesCsv),
            parseCsvString<TripRow>(tripsCsv),
        ]);
        const leoAgencyIds = new Set(
            agencies
                .map((row) => agencyRowSchema.parse(row))
                .filter((agency) =>
                    TARGET_AGENCY_NAMES.has(agency.agency_name.trim()),
                )
                .map((agency) => agency.agency_id),
        );
        const leoRoutes = routes
            .map((row) => parseRoute(row))
            .filter((route) => leoAgencyIds.has(route.agencyId));
        const leoRouteIds = new Set(leoRoutes.map((route) => route.id));
        const leoTrips = trips
            .map((row) => parseTrip(row))
            .filter((trip) => leoRouteIds.has(trip.routeId));
        const leoTripById = new Map(leoTrips.map((trip) => [trip.id, trip]));
        const leoStopTimesByTripId = new Map<string, ParsedStopTime[]>();

        for (const stopTime of stopTimes.map((row) => parseStopTime(row))) {
            if (!leoTripById.has(stopTime.tripId)) {
                continue;
            }

            const tripStopTimes =
                leoStopTimesByTripId.get(stopTime.tripId) ?? [];

            tripStopTimes.push(stopTime);
            leoStopTimesByTripId.set(stopTime.tripId, tripStopTimes);
        }

        const stopsById = new Map(
            stops.map((row) => {
                const stop = parseStop(row);

                return [stop.id, stop] as const;
            }),
        );
        const referencedStopIds = new Set<string>();

        for (const tripStopTimes of leoStopTimesByTripId.values()) {
            for (const stopTime of tripStopTimes) {
                referencedStopIds.add(stopTime.stopId);
            }
        }

        const { logicalStops, platformById } = buildLogicalStops({
            referencedStopIds,
            stopsById,
        });
        const routeIdsByPlatformId = new Map<string, Set<string>>();
        const patternsByRouteAndDirection = new Map<
            string,
            Map<string, DominantPattern>
        >();

        for (const trip of leoTrips) {
            const tripStopTimes = (
                leoStopTimesByTripId.get(trip.id) ?? []
            ).sort((left, right) => left.stopSequence - right.stopSequence);
            const platformIds = tripStopTimes
                .map((stopTime) => toLeoPlatformId(stopTime.stopId))
                .filter((platformId) => platformById.has(platformId));

            if (platformIds.length === 0) {
                continue;
            }

            for (const platformId of platformIds) {
                const routeIds =
                    routeIdsByPlatformId.get(platformId) ?? new Set<string>();

                routeIds.add(toLeoRouteId(trip.routeId));
                routeIdsByPlatformId.set(platformId, routeIds);
            }

            const routeDirectionKey = `${trip.routeId}::${trip.directionId}`;
            const patternKey = platformIds.join(">");
            const patterns =
                patternsByRouteAndDirection.get(routeDirectionKey) ?? new Map();
            const currentPattern = patterns.get(patternKey);

            if (currentPattern) {
                currentPattern.tripCount += 1;
            } else {
                patterns.set(patternKey, {
                    directionId: trip.directionId,
                    platformIds,
                    tripCount: 1,
                });
            }

            patternsByRouteAndDirection.set(routeDirectionKey, patterns);
        }

        for (const logicalStop of logicalStops) {
            for (const platform of logicalStop.platforms) {
                const routeIds = [
                    ...(routeIdsByPlatformId.get(platform.id) ?? new Set()),
                ]
                    .sort((left, right) => left.localeCompare(right))
                    .map((routeId) => {
                        const route = leoRoutes.find(
                            (candidate) =>
                                toLeoRouteId(candidate.id) === routeId,
                        );

                        return route
                            ? {
                                  id: routeId,
                                  name: route.shortName,
                              }
                            : null;
                    })
                    .filter(
                        (route): route is LeoPlatformRoute => route !== null,
                    );

                platform.routes = routeIds;
            }
        }

        const catalogRoutes = leoRoutes
            .map<LeoRoute>((route) => {
                const dominantPatterns = [
                    ...patternsByRouteAndDirection.entries(),
                ]
                    .filter(([key]) => key.startsWith(`${route.id}::`))
                    .map(([key, patterns]) => {
                        const dominantPattern = chooseDominantPattern(patterns);

                        return dominantPattern
                            ? {
                                  key,
                                  value: dominantPattern,
                              }
                            : null;
                    })
                    .filter(
                        (
                            entry,
                        ): entry is {
                            key: string;
                            value: DominantPattern;
                        } => entry !== null,
                    )
                    .sort((left, right) => left.key.localeCompare(right.key));
                const directions = dominantPatterns.map(({ value }) => ({
                    id: value.directionId,
                    platforms: value.platformIds
                        .map((platformId) => platformById.get(platformId))
                        .filter(
                            (platform): platform is LeoPlatform =>
                                platform !== undefined,
                        )
                        .map((platform) => ({
                            id: platform.id,
                            latitude: platform.latitude,
                            longitude: platform.longitude,
                            name: platform.name,
                            isMetro: platform.isMetro,
                            code: platform.code,
                        })),
                }));
                const shapes = dominantPatterns.map(({ value }) => {
                    const points = value.platformIds
                        .map((platformId) => platformById.get(platformId))
                        .filter(
                            (platform): platform is LeoPlatform =>
                                platform !== undefined,
                        )
                        .map((platform) => ({
                            latitude: platform.latitude,
                            longitude: platform.longitude,
                        }));
                    const dedupedPoints = points.filter((point, index) => {
                        if (index === 0) {
                            return true;
                        }

                        const previousPoint = points[index - 1];

                        return (
                            previousPoint?.latitude !== point.latitude ||
                            previousPoint.longitude !== point.longitude
                        );
                    });

                    return {
                        id: `generated:${route.id}:${value.directionId}`,
                        directionId: value.directionId,
                        tripCount: value.tripCount,
                        geoJson: toGeoJsonString(
                            dedupedPoints.map((point) => [
                                point.longitude,
                                point.latitude,
                            ]),
                        ),
                        points: dedupedPoints,
                    };
                });

                return {
                    id: toLeoRouteId(route.id),
                    shortName: route.shortName,
                    longName: route.longName,
                    color: route.color,
                    url: route.url,
                    type: route.type,
                    directions,
                    shapes,
                };
            })
            .sort((left, right) => left.id.localeCompare(right.id));
        const catalogStops = logicalStops
            .map((logicalStop) => ({
                ...logicalStop,
                platforms: [...logicalStop.platforms].sort(sortPlatformIds),
            }))
            .sort((left, right) => left.id.localeCompare(right.id));

        return {
            routes: catalogRoutes,
            stops: catalogStops,
        };
    })();
