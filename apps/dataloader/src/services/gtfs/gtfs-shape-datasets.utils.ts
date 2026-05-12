import type { GtfsFeedId } from "@metro-now/database";

import type {
    GtfsSnapshot,
    SyncedGtfsRouteShape,
} from "../../types/sync.types";
import {
    GTFS_LOCATION_TYPE_ENTRANCE,
    type ParsedGtfsShapePointRecord,
    type ParsedGtfsStopRecord,
    type ParsedGtfsTripRecord,
    normalizeGtfsStopId,
} from "./gtfs-record-parsers.utils";

const getGtfsRouteShapeKey = (routeShape: {
    routeId: string;
    directionId: string;
    shapeId: string;
}): string =>
    [routeShape.routeId, routeShape.directionId, routeShape.shapeId].join("::");

const getGtfsRouteDirectionKey = (routeShape: {
    routeId: string;
    directionId: string;
}): string => [routeShape.routeId, routeShape.directionId].join("::");

const comparePrimaryRouteShape = (
    left: {
        shapeId: string;
        tripCount: number;
        geoJson: { coordinates: [number, number][] };
    },
    right: {
        shapeId: string;
        tripCount: number;
        geoJson: { coordinates: [number, number][] };
    },
): number => {
    if (left.tripCount !== right.tripCount) {
        return left.tripCount - right.tripCount;
    }

    if (left.geoJson.coordinates.length !== right.geoJson.coordinates.length) {
        return (
            left.geoJson.coordinates.length - right.geoJson.coordinates.length
        );
    }

    return right.shapeId.localeCompare(left.shapeId);
};

const sortShapePoints = (
    shapePoints: ParsedGtfsShapePointRecord[],
): ParsedGtfsShapePointRecord[] =>
    [...shapePoints].sort((left, right) => left.sequence - right.sequence);

const getCanonicalStopIdFromParentStationId = (
    parentStationId: string,
): string => {
    const normalizedParentStationId = normalizeGtfsStopId(parentStationId);
    const stopId = normalizedParentStationId.split("S")[0];

    if (!stopId || stopId === normalizedParentStationId) {
        throw new Error(
            `Unexpected GTFS parent_station format '${parentStationId}'`,
        );
    }

    return stopId;
};

export const buildGtfsShapeDatasets = ({
    feedId,
    trips,
    shapePoints,
    routeIdsWithImportedPlatforms,
}: {
    feedId: GtfsFeedId;
    trips: ParsedGtfsTripRecord[];
    shapePoints: ParsedGtfsShapePointRecord[];
    routeIdsWithImportedPlatforms: Set<string>;
}): Pick<GtfsSnapshot, "gtfsRouteShapes"> => {
    const routeShapeTripCountsByKey = new Map<
        string,
        {
            routeId: string;
            directionId: string;
            shapeId: string;
            tripCount: number;
        }
    >();

    for (const trip of trips) {
        if (!trip.shapeId || !routeIdsWithImportedPlatforms.has(trip.routeId)) {
            continue;
        }

        const routeShapeKey = getGtfsRouteShapeKey({
            routeId: trip.routeId,
            directionId: trip.directionId,
            shapeId: trip.shapeId,
        });
        const existingRouteShape = routeShapeTripCountsByKey.get(routeShapeKey);

        if (existingRouteShape) {
            existingRouteShape.tripCount += 1;
            continue;
        }

        routeShapeTripCountsByKey.set(routeShapeKey, {
            routeId: trip.routeId,
            directionId: trip.directionId,
            shapeId: trip.shapeId,
            tripCount: 1,
        });
    }

    const shapePointsByShapeId = new Map<
        string,
        ParsedGtfsShapePointRecord[]
    >();

    for (const shapePoint of shapePoints) {
        const existingShapePoints =
            shapePointsByShapeId.get(shapePoint.shapeId) ?? [];

        existingShapePoints.push(shapePoint);
        shapePointsByShapeId.set(shapePoint.shapeId, existingShapePoints);
    }
    const gtfsRouteShapes = [...routeShapeTripCountsByKey.values()]
        .map((routeShape) => {
            const unsortedShapePoints = shapePointsByShapeId.get(
                routeShape.shapeId,
            );

            if (!unsortedShapePoints || unsortedShapePoints.length === 0) {
                throw new Error(
                    `GTFS trip references missing shape '${routeShape.shapeId}' for route '${routeShape.routeId}' direction '${routeShape.directionId}'`,
                );
            }

            const sortedShapePoints = sortShapePoints(unsortedShapePoints);

            return {
                feedId,
                routeId: routeShape.routeId,
                directionId: routeShape.directionId,
                shapeId: routeShape.shapeId,
                tripCount: routeShape.tripCount,
                isPrimary: false,
                geoJson: {
                    type: "LineString" as const,
                    coordinates: sortedShapePoints.map(
                        (shapePoint): [number, number] => [
                            shapePoint.longitude,
                            shapePoint.latitude,
                        ],
                    ),
                },
            } satisfies SyncedGtfsRouteShape;
        })
        .sort((left, right) => {
            return (
                left.routeId.localeCompare(right.routeId) ||
                left.directionId.localeCompare(right.directionId) ||
                left.shapeId.localeCompare(right.shapeId)
            );
        });
    const primaryRouteShapeByRouteDirection = new Map<
        string,
        (typeof gtfsRouteShapes)[number]
    >();

    for (const routeShape of gtfsRouteShapes) {
        const routeDirectionKey = getGtfsRouteDirectionKey(routeShape);
        const currentPrimaryRouteShape =
            primaryRouteShapeByRouteDirection.get(routeDirectionKey);

        if (
            !currentPrimaryRouteShape ||
            comparePrimaryRouteShape(routeShape, currentPrimaryRouteShape) > 0
        ) {
            primaryRouteShapeByRouteDirection.set(
                routeDirectionKey,
                routeShape,
            );
        }
    }

    return {
        gtfsRouteShapes: gtfsRouteShapes.map((routeShape) => ({
            ...routeShape,
            isPrimary:
                getGtfsRouteShapeKey(
                    primaryRouteShapeByRouteDirection.get(
                        getGtfsRouteDirectionKey(routeShape),
                    ) ?? routeShape,
                ) === getGtfsRouteShapeKey(routeShape),
        })),
    };
};

export const buildGtfsStationEntranceDataset = ({
    feedId,
    stops,
    importedMetroStopIds,
}: {
    feedId: GtfsFeedId;
    stops: ParsedGtfsStopRecord[];
    importedMetroStopIds: Set<string>;
}): Pick<GtfsSnapshot, "gtfsStationEntrances"> => {
    const gtfsStationEntrancesById = new Map<
        string,
        GtfsSnapshot["gtfsStationEntrances"][number]
    >();

    for (const stop of stops) {
        if (stop.locationType !== GTFS_LOCATION_TYPE_ENTRANCE) {
            continue;
        }

        if (!stop.parentStationId) {
            throw new Error(
                `GTFS station entrance '${stop.id}' is missing parent_station`,
            );
        }

        const stopId = getCanonicalStopIdFromParentStationId(
            stop.parentStationId,
        );

        if (!importedMetroStopIds.has(stopId)) {
            continue;
        }

        gtfsStationEntrancesById.set(stop.id, {
            id: stop.id,
            feedId,
            stopId,
            parentStationId: stop.parentStationId,
            name: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
        });
    }

    return {
        gtfsStationEntrances: Array.from(
            gtfsStationEntrancesById.values(),
        ).sort(
            (left, right) =>
                left.stopId.localeCompare(right.stopId) ||
                left.parentStationId.localeCompare(right.parentStationId) ||
                left.id.localeCompare(right.id),
        ),
    };
};
