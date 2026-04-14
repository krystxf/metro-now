import {
    GtfsFeedId,
    type GtfsRoute,
    type GtfsRouteShape,
    type Platform,
} from "@metro-now/database";
import { classifyRoute } from "@metro-now/shared";
import { CACHE_MANAGER, type Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { group } from "radash";

import {
    CACHE_KEYS,
    CACHE_TTL,
    uniqueSortedStrings,
} from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import { isLeoRouteId } from "src/modules/leo/leo-id.utils";
import type { LeoRoute } from "src/modules/leo/leo.types";
import {
    toLookupRouteId,
    toPublicRouteId,
} from "src/modules/route/route-id.utils";
import { getVehicleTypeFromGtfsType } from "src/modules/route/route-vehicle-type.utils";
import { VehicleType } from "src/types/graphql.generated";
import { loadCachedBatch } from "src/utils/cache-batch";

type RouteRow = Pick<
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

type RoutePlatformRecord = Pick<
    Platform,
    "code" | "id" | "isMetro" | "latitude" | "longitude" | "name"
>;

type RouteStopRow = {
    feedId: GtfsFeedId;
    directionId: string;
    platform: RoutePlatformRecord | null;
    routeId: string;
    stopSequence: number;
};

type RouteExactShapeRow = Pick<
    GtfsRouteShape,
    "directionId" | "feedId" | "geoJson" | "routeId" | "shapeId" | "tripCount"
>;

const getRouteCompositeKey = (routeId: string, feedId: GtfsFeedId): string =>
    `${feedId}:${routeId}`;

const processRoute = (
    route: RouteRow,
    routeStops: RouteStopRow[],
    routeExactShapes: RouteExactShapeRow[],
) => {
    const toGeoJsonString = (
        coordinates: RouteExactShapeRow["geoJson"]["coordinates"],
    ): string =>
        JSON.stringify({
            type: "LineString",
            coordinates,
        });

    const sortedRouteShapes = [...routeExactShapes].sort((left, right) => {
        return (
            left.directionId.localeCompare(right.directionId) ||
            right.tripCount - left.tripCount ||
            left.shapeId.localeCompare(right.shapeId)
        );
    });

    return {
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
        shapes: sortedRouteShapes.map((shape) => ({
            id: shape.shapeId,
            directionId: shape.directionId,
            tripCount: shape.tripCount,
            points: shape.geoJson.coordinates.map(([longitude, latitude]) => ({
                latitude,
                longitude,
            })),
            geoJson: toGeoJsonString(shape.geoJson.coordinates),
        })),
    };
};

type GraphQLRouteRecord = ReturnType<typeof processRoute>;

const leoRouteToGraphQLRecord = (leo: LeoRoute): GraphQLRouteRecord => ({
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

const ROUTE_DATA_CACHE_TTL_MS = CACHE_TTL.routeData;

@Injectable()
export class RouteService {
    private gtfsRouteShapeTableAvailable: boolean | undefined;

    constructor(
        private readonly database: DatabaseService,
        private readonly leoGtfsService: LeoGtfsService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    private async loadRouteRows({
        routeIds,
        feedId,
    }: {
        routeIds?: readonly string[];
        feedId?: GtfsFeedId;
    }): Promise<RouteRow[]> {
        if (routeIds && routeIds.length === 0) {
            return [];
        }

        let query = this.database.db
            .selectFrom("GtfsRoute")
            .select([
                "id",
                "feedId",
                "shortName",
                "longName",
                "isNight",
                "color",
                "url",
                "type",
            ]);

        if (routeIds) {
            query = query.where("id", "in", [...routeIds]);
        }

        if (feedId) {
            query = query.where("feedId", "=", feedId);
        }

        return query.orderBy("id", "asc").orderBy("feedId", "asc").execute();
    }

    private async loadRouteStops(
        routeIds: readonly string[],
        feedId?: GtfsFeedId,
    ): Promise<Map<string, RouteStopRow[]>> {
        const routeStopsByRouteId = new Map<string, RouteStopRow[]>(
            routeIds.map((routeId) =>
                feedId
                    ? [getRouteCompositeKey(routeId, feedId), []]
                    : [routeId, []],
            ),
        );

        if (routeIds.length === 0) {
            return routeStopsByRouteId;
        }

        const rows = await this.database.db
            .selectFrom("GtfsRouteStop")
            .leftJoin("Platform", "Platform.id", "GtfsRouteStop.stopId")
            .select([
                "GtfsRouteStop.feedId as feedId",
                "GtfsRouteStop.routeId as routeId",
                "GtfsRouteStop.directionId as directionId",
                "GtfsRouteStop.stopSequence as stopSequence",
                "Platform.id as platformId",
                "Platform.latitude as platformLatitude",
                "Platform.longitude as platformLongitude",
                "Platform.name as platformName",
                "Platform.isMetro as platformIsMetro",
                "Platform.code as platformCode",
            ])
            .where("GtfsRouteStop.routeId", "in", [...routeIds])
            .$if(Boolean(feedId), (qb) =>
                qb.where("GtfsRouteStop.feedId", "=", feedId as GtfsFeedId),
            )
            .orderBy("GtfsRouteStop.routeId", "asc")
            .orderBy("GtfsRouteStop.feedId", "asc")
            .orderBy("GtfsRouteStop.directionId", "asc")
            .orderBy("GtfsRouteStop.stopSequence", "asc")
            .execute();

        for (const row of rows) {
            const key = feedId
                ? getRouteCompositeKey(row.routeId, row.feedId)
                : row.routeId;

            routeStopsByRouteId.get(key)?.push({
                feedId: row.feedId,
                routeId: row.routeId,
                directionId: row.directionId,
                stopSequence: row.stopSequence,
                platform: row.platformId
                    ? {
                          id: row.platformId,
                          latitude: row.platformLatitude ?? 0,
                          longitude: row.platformLongitude ?? 0,
                          name: row.platformName ?? "",
                          isMetro: row.platformIsMetro ?? false,
                          code: row.platformCode,
                      }
                    : null,
            });
        }

        return routeStopsByRouteId;
    }

    private async loadRouteExactShapes(
        routeIds: readonly string[],
        feedId?: GtfsFeedId,
    ): Promise<Map<string, RouteExactShapeRow[]>> {
        const routeExactShapesByRouteId = new Map<string, RouteExactShapeRow[]>(
            routeIds.map((routeId) =>
                feedId
                    ? [getRouteCompositeKey(routeId, feedId), []]
                    : [routeId, []],
            ),
        );

        if (routeIds.length === 0) {
            return routeExactShapesByRouteId;
        }

        if (this.gtfsRouteShapeTableAvailable === false) {
            return routeExactShapesByRouteId;
        }

        let rows: RouteExactShapeRow[];

        try {
            rows = await this.database.db
                .selectFrom("GtfsRouteShape")
                .select([
                    "routeId",
                    "feedId",
                    "directionId",
                    "shapeId",
                    "tripCount",
                    "geoJson",
                ])
                .where("routeId", "in", [...routeIds])
                .$if(Boolean(feedId), (qb) =>
                    qb.where("feedId", "=", feedId as GtfsFeedId),
                )
                .where("isPrimary", "=", true)
                .orderBy("routeId", "asc")
                .orderBy("feedId", "asc")
                .orderBy("directionId", "asc")
                .orderBy("shapeId", "asc")
                .execute();
            this.gtfsRouteShapeTableAvailable = true;
        } catch (error) {
            if (this.isMissingTableError(error, "GtfsRouteShape")) {
                this.gtfsRouteShapeTableAvailable = false;

                return routeExactShapesByRouteId;
            }

            throw error;
        }

        for (const row of rows) {
            const key = feedId
                ? getRouteCompositeKey(row.routeId, row.feedId)
                : row.routeId;

            routeExactShapesByRouteId.get(key)?.push(row);
        }

        return routeExactShapesByRouteId;
    }

    private isMissingTableError(error: unknown, tableName: string): boolean {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "42P01"
        ) {
            return true;
        }

        if (
            error instanceof Error &&
            error.message.includes(`relation "${tableName}" does not exist`)
        ) {
            return true;
        }

        return false;
    }

    private async loadGraphQLRoutesByIds(
        routeIds: readonly string[],
        feedId?: GtfsFeedId,
    ): Promise<GraphQLRouteRecord[]> {
        const [routes, routeStopsByRouteId, routeExactShapesByRouteId] =
            await Promise.all([
                this.loadRouteRows({
                    routeIds,
                    ...(feedId ? { feedId } : {}),
                }),
                this.loadRouteStops(routeIds, feedId),
                this.loadRouteExactShapes(routeIds, feedId),
            ]);

        return routes.map((route) =>
            processRoute(
                route,
                routeStopsByRouteId.get(
                    feedId
                        ? getRouteCompositeKey(route.id, route.feedId)
                        : route.id,
                ) ?? [],
                routeExactShapesByRouteId.get(
                    feedId
                        ? getRouteCompositeKey(route.id, route.feedId)
                        : route.id,
                ) ?? [],
            ),
        );
    }

    private async loadGraphQLRoutesByPlatformIds(
        platformIds: readonly string[],
    ): Promise<Map<string, GraphQLRouteRecord[]>> {
        const routesByPlatformId = new Map<string, GraphQLRouteRecord[]>(
            platformIds.map((platformId) => [platformId, []]),
        );

        if (platformIds.length === 0) {
            return routesByPlatformId;
        }

        const routeLinks = await this.database.db
            .selectFrom("GtfsRouteStop")
            .select(["feedId", "routeId", "stopId as platformId"])
            .distinct()
            .where("stopId", "in", [...platformIds])
            .orderBy("routeId", "asc")
            .orderBy("feedId", "asc")
            .execute();
        const routeKeys = uniqueSortedStrings(
            routeLinks.map(({ feedId, routeId }) =>
                getRouteCompositeKey(routeId, feedId),
            ),
        );
        const routes = await Promise.all(
            routeKeys.map((routeKey) => {
                const [feedId, routeId] = routeKey.split(":", 2) as [
                    GtfsFeedId,
                    string,
                ];

                return this.getOneGraphQL(routeId, feedId);
            }),
        );
        const routeById = new Map<string, GraphQLRouteRecord>(
            routes.flatMap((route) =>
                route
                    ? [
                          [
                              getRouteCompositeKey(
                                  toLookupRouteId(route.id),
                                  route.feed,
                              ),
                              route,
                          ] as const,
                      ]
                    : [],
            ),
        );

        for (const { platformId, routeId, feedId } of routeLinks) {
            const route = routeById.get(getRouteCompositeKey(routeId, feedId));

            if (route) {
                routesByPlatformId.get(platformId)?.push(route);
            }
        }

        return routesByPlatformId;
    }

    async getManyGraphQL(): Promise<GraphQLRouteRecord[]> {
        return this.cacheManager.wrap(
            CACHE_KEYS.route.getManyGraphQL({}),
            async () => {
                const routeRows = await this.loadRouteRows({});

                return this.loadGraphQLRoutesByIds(
                    routeRows.map((route) => route.id),
                );
            },
            ROUTE_DATA_CACHE_TTL_MS,
        );
    }

    async getOneGraphQL(
        id: string,
        feedId?: GtfsFeedId,
    ): Promise<GraphQLRouteRecord | null> {
        return this.cacheManager.wrap(
            CACHE_KEYS.route.getOneGraphQL({ id, feedId }),
            async () => {
                const lookupId = toLookupRouteId(id);
                const [route] = await this.loadGraphQLRoutesByIds(
                    [lookupId],
                    feedId,
                );

                if (route) {
                    return route;
                }

                if (isLeoRouteId(lookupId)) {
                    const leoRoute =
                        await this.leoGtfsService.getRouteById(lookupId);

                    return leoRoute ? leoRouteToGraphQLRecord(leoRoute) : null;
                }

                return null;
            },
            ROUTE_DATA_CACHE_TTL_MS,
        );
    }

    async getGraphQLByIds(
        ids: readonly string[],
    ): Promise<GraphQLRouteRecord[]> {
        const routesById = await loadCachedBatch({
            cacheManager: this.cacheManager,
            getCacheKey: CACHE_KEYS.route.getOneGraphQL,
            keys: ids,
            loadMissing: async (missingIds) => {
                const dbIds = missingIds.filter((key) => !isLeoRouteId(key));
                const leoIds = missingIds.filter((key) => isLeoRouteId(key));

                const [dbRoutes, leoRoutes] = await Promise.all([
                    this.loadGraphQLRoutesByIds(dbIds),
                    leoIds.length > 0
                        ? this.leoGtfsService.getRoutesByIds(leoIds)
                        : Promise.resolve([] as LeoRoute[]),
                ]);

                const result = new Map<string, GraphQLRouteRecord | null>(
                    missingIds.map((key) => [key, null]),
                );

                for (const route of dbRoutes) {
                    result.set(toLookupRouteId(route.id), route);
                }

                for (const leoRoute of leoRoutes) {
                    result.set(leoRoute.id, leoRouteToGraphQLRecord(leoRoute));
                }

                return result;
            },
            ttlMs: ROUTE_DATA_CACHE_TTL_MS,
        });

        return Array.from(new Set(ids))
            .map((id) => routesById.get(id))
            .filter((route): route is GraphQLRouteRecord => route !== null);
    }

    async getManyGraphQLByPlatformIds(
        platformIds: readonly string[],
    ): Promise<GraphQLRouteRecord[][]> {
        const routesByPlatformId = await loadCachedBatch({
            cacheManager: this.cacheManager,
            getCacheKey: CACHE_KEYS.route.getManyGraphQLByPlatformId,
            keys: platformIds,
            loadMissing: async (missingPlatformIds) =>
                this.loadGraphQLRoutesByPlatformIds(missingPlatformIds),
            ttlMs: ROUTE_DATA_CACHE_TTL_MS,
        });

        return platformIds.map(
            (platformId) => routesByPlatformId.get(platformId) ?? [],
        );
    }

    isSubstitute(routeName: string): boolean {
        return routeName.startsWith("X");
    }

    private getNameWithoutSubstitute(routeName: string): string {
        return this.isSubstitute(routeName) ? routeName.slice(1) : routeName;
    }

    isNight(routeName: string, feedId: GtfsFeedId = GtfsFeedId.PID): boolean {
        return (
            classifyRoute({
                feedId,
                routeShortName: routeName,
            }).isNight ?? false
        );
    }

    getVehicleType(routeName: string): VehicleType {
        return this.getVehicleTypeForRoute({
            feedId: GtfsFeedId.PID,
            routeName,
        });
    }

    getVehicleTypeForRoute({
        feedId = GtfsFeedId.PID,
        routeName,
        gtfsRouteType,
    }: {
        feedId?: GtfsFeedId | null;
        routeName: string;
        gtfsRouteType?: string | null;
    }): VehicleType {
        const classifiedRoute = classifyRoute({
            feedId,
            routeShortName: routeName,
            routeType: gtfsRouteType,
        });
        const gtfsVehicleType = getVehicleTypeFromGtfsType(gtfsRouteType);
        const classifiedVehicleType =
            classifiedRoute.vehicleType === "SUBWAY"
                ? VehicleType.SUBWAY
                : classifiedRoute.vehicleType === "TROLLEYBUS"
                  ? VehicleType.TROLLEYBUS
                  : classifiedRoute.vehicleType === "TRAM"
                    ? VehicleType.TRAM
                    : classifiedRoute.vehicleType === "TRAIN"
                      ? VehicleType.TRAIN
                      : classifiedRoute.vehicleType === "FERRY"
                        ? VehicleType.FERRY
                        : classifiedRoute.vehicleType === "FUNICULAR"
                          ? VehicleType.FUNICULAR
                          : classifiedRoute.vehicleType === "BUS"
                            ? VehicleType.BUS
                            : null;

        if (classifiedVehicleType) {
            return classifiedVehicleType;
        }

        return gtfsVehicleType ?? VehicleType.BUS;
    }
}
