import {
    GtfsFeedId,
    type GtfsRoute,
    type GtfsRouteShape,
    type Platform,
} from "@metro-now/database";
import { group } from "radash";

import type { LeoRoute } from "src/modules/leo/leo.types";
import { toPublicRouteId } from "src/modules/route/route-id.utils";

export type RouteRow = Pick<
    GtfsRoute,
    | "color"
    | "feedId"
    | "id"
    | "isNight"
    | "longName"
    | "shortName"
    | "type"
    | "url"
>;

export type RoutePlatformRecord = Pick<
    Platform,
    "code" | "id" | "isMetro" | "latitude" | "longitude" | "name"
>;

export type RouteStopRow = {
    directionId: string;
    platform: RoutePlatformRecord | null;
    routeId: string;
    stopSequence: number;
};

export type RouteExactShapeRow = Pick<
    GtfsRouteShape,
    "directionId" | "geoJson" | "routeId" | "shapeId" | "tripCount"
>;

const toGeoJsonLineString = (
    coordinates: RouteExactShapeRow["geoJson"]["coordinates"],
): string =>
    JSON.stringify({
        type: "LineString",
        coordinates,
    });

const sortRouteShapes = (
    shapes: readonly RouteExactShapeRow[],
): RouteExactShapeRow[] =>
    [...shapes].sort(
        (left, right) =>
            left.directionId.localeCompare(right.directionId) ||
            right.tripCount - left.tripCount ||
            left.shapeId.localeCompare(right.shapeId),
    );

export const processRoute = (
    route: RouteRow,
    routeStops: RouteStopRow[],
    routeExactShapes: RouteExactShapeRow[],
) => ({
    ...route,
    id: toPublicRouteId(route.id),
    name: route.shortName,
    feed: route.feedId,
    isNight: route.isNight ?? false,
    directions: Object.entries(
        group(routeStops, ({ directionId }) => directionId),
    ).map(([key, value]) => ({
        id: key,
        platforms: (value ?? [])
            .sort((left, right) => left.stopSequence - right.stopSequence)
            .flatMap((routeStop) =>
                routeStop.platform ? [routeStop.platform] : [],
            ),
    })),
    shapes: sortRouteShapes(routeExactShapes).map((shape) => ({
        id: shape.shapeId,
        directionId: shape.directionId,
        tripCount: shape.tripCount,
        points: shape.geoJson.coordinates.map(([longitude, latitude]) => ({
            latitude,
            longitude,
        })),
        geoJson: toGeoJsonLineString(shape.geoJson.coordinates),
    })),
});

export type GraphQLRouteRecord = ReturnType<typeof processRoute>;

export const leoRouteToGraphQLRecord = (leo: LeoRoute): GraphQLRouteRecord => ({
    id: leo.id,
    feedId: GtfsFeedId.LEO,
    shortName: leo.shortName,
    longName: leo.longName ?? "",
    isNight: false,
    color: leo.color,
    url: leo.url,
    type: leo.type,
    name: leo.shortName,
    feed: GtfsFeedId.LEO,
    directions: leo.directions.map((direction) => ({
        id: direction.id,
        platforms: direction.platforms.map((platform) => ({ ...platform })),
    })),
    shapes: leo.shapes.map((shape) => ({
        id: shape.id,
        directionId: shape.directionId,
        tripCount: shape.tripCount,
        geoJson: shape.geoJson,
        points: shape.points.map((point) => ({ ...point })),
    })),
});
