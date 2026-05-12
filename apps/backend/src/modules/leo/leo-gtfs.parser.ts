import {
    type AgencyRow,
    type DominantPattern,
    type ParsedStopTime,
    type RouteRow,
    type StopRow,
    type StopTimeRow,
    type TripRow,
    agencyRowSchema,
    buildLogicalStops,
    chooseDominantPattern,
    parseCsvString,
    parseRoute,
    parseStop,
    parseStopTime,
    parseTrip,
} from "src/modules/leo/leo-gtfs-parsers.utils";
import { toLeoPlatformId, toLeoRouteId } from "src/modules/leo/leo-id.utils";
import type {
    LeoCatalog,
    LeoPlatform,
    LeoPlatformRoute,
    LeoRoute,
} from "src/modules/leo/leo.types";

export { normalizeStopName } from "src/modules/leo/leo-gtfs-parsers.utils";

const TARGET_AGENCY_NAMES = new Set([
    "Leo Express s.r.o.",
    "Leo Express Slovensko s.r.o.",
]);

const toGeoJsonString = (points: Array<[number, number]>): string =>
    JSON.stringify({
        type: "LineString",
        coordinates: points,
    });

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
                platforms: [...logicalStop.platforms].sort((left, right) =>
                    left.id.localeCompare(right.id),
                ),
            }))
            .sort((left, right) => left.id.localeCompare(right.id));

        return {
            routes: catalogRoutes,
            stops: catalogStops,
        };
    })();
