import { GtfsFeedId } from "@metro-now/database";
import { classifyRoute } from "@metro-now/shared";
import { CACHE_MANAGER, type Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";

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
    type GraphQLRouteRecord,
    type RouteExactShapeRow,
    type RouteRow,
    type RouteStopRow,
    leoRouteToGraphQLRecord,
    processRoute,
} from "src/modules/route/route-graphql.utils";
import { toLookupRouteId } from "src/modules/route/route-id.utils";
import {
    getVehicleTypeFromDatabaseType,
    getVehicleTypeFromGtfsType,
} from "src/modules/route/route-vehicle-type.utils";
import { VehicleType } from "src/types/graphql.generated";
import { loadCachedBatch } from "src/utils/cache-batch";

const ROUTE_DATA_CACHE_TTL_MS = CACHE_TTL.routeData;

const CLASSIFIED_VEHICLE_TYPE_TO_GRAPHQL: Record<string, VehicleType> = {
    SUBWAY: VehicleType.SUBWAY,
    TROLLEYBUS: VehicleType.TROLLEYBUS,
    TRAM: VehicleType.TRAM,
    TRAIN: VehicleType.TRAIN,
    FERRY: VehicleType.FERRY,
    FUNICULAR: VehicleType.FUNICULAR,
    BUS: VehicleType.BUS,
};

@Injectable()
export class RouteService {
    private gtfsRouteShapeTableAvailable: boolean | undefined;

    constructor(
        private readonly database: DatabaseService,
        private readonly leoGtfsService: LeoGtfsService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    private async loadRouteRows(
        routeIds?: readonly string[],
    ): Promise<RouteRow[]> {
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
                "vehicleType",
            ]);

        if (routeIds) {
            query = query.where("id", "in", [...routeIds]);
        }

        return query.orderBy("id", "asc").execute();
    }

    private async loadRouteStops(
        routeIds: readonly string[],
    ): Promise<Map<string, RouteStopRow[]>> {
        const routeStopsByRouteId = new Map<string, RouteStopRow[]>(
            routeIds.map((routeId) => [routeId, []]),
        );

        if (routeIds.length === 0) {
            return routeStopsByRouteId;
        }

        const rows = await this.database.db
            .selectFrom("GtfsRouteStop")
            .leftJoin("Platform", "Platform.id", "GtfsRouteStop.stopId")
            .select([
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
            .orderBy("GtfsRouteStop.routeId", "asc")
            .orderBy("GtfsRouteStop.directionId", "asc")
            .orderBy("GtfsRouteStop.stopSequence", "asc")
            .execute();

        for (const row of rows) {
            routeStopsByRouteId.get(row.routeId)?.push({
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
    ): Promise<Map<string, RouteExactShapeRow[]>> {
        const routeExactShapesByRouteId = new Map<string, RouteExactShapeRow[]>(
            routeIds.map((routeId) => [routeId, []]),
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
                    "directionId",
                    "shapeId",
                    "tripCount",
                    "geoJson",
                ])
                .where("routeId", "in", [...routeIds])
                .where("isPrimary", "=", true)
                .orderBy("routeId", "asc")
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
            routeExactShapesByRouteId.get(row.routeId)?.push(row);
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
    ): Promise<GraphQLRouteRecord[]> {
        const [routes, routeStopsByRouteId, routeExactShapesByRouteId] =
            await Promise.all([
                this.loadRouteRows(routeIds),
                this.loadRouteStops(routeIds),
                this.loadRouteExactShapes(routeIds),
            ]);

        return routes.map((route) =>
            processRoute(
                route,
                routeStopsByRouteId.get(route.id) ?? [],
                routeExactShapesByRouteId.get(route.id) ?? [],
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
            .select(["routeId", "stopId as platformId"])
            .distinct()
            .where("stopId", "in", [...platformIds])
            .orderBy("routeId", "asc")
            .execute();
        const routeIds = uniqueSortedStrings(
            routeLinks.map(({ routeId }) => routeId),
        );
        const routes = await this.loadGraphQLRoutesByIds(routeIds);
        const routeById = new Map<string, GraphQLRouteRecord>(
            routes.map((route) => [toLookupRouteId(route.id), route] as const),
        );

        for (const { platformId, routeId } of routeLinks) {
            const route = routeById.get(routeId);

            if (route) {
                routesByPlatformId.get(platformId)?.push(route);
            }
        }

        return routesByPlatformId;
    }

    async getManyGraphQL({
        vehicleType,
    }: {
        vehicleType?: VehicleType[];
    } = {}): Promise<GraphQLRouteRecord[]> {
        const normalizedVehicleTypes =
            vehicleType && vehicleType.length > 0
                ? [...new Set(vehicleType)].sort((left, right) =>
                      left.localeCompare(right),
                  )
                : null;

        return this.cacheManager.wrap(
            CACHE_KEYS.route.getManyGraphQL({
                vehicleType: normalizedVehicleTypes,
            }),
            async () => {
                const routeRows = await this.loadRouteRows();
                const filteredRouteRows = normalizedVehicleTypes
                    ? routeRows.filter((route) =>
                          normalizedVehicleTypes.includes(
                              getVehicleTypeFromDatabaseType(
                                  route.vehicleType,
                              ) ??
                                  this.getVehicleTypeForRoute({
                                      feedId: route.feedId,
                                      routeName: route.shortName,
                                      gtfsRouteType: route.type,
                                  }),
                          ),
                      )
                    : routeRows;

                return this.loadGraphQLRoutesByIds(
                    filteredRouteRows.map((route) => route.id),
                );
            },
            ROUTE_DATA_CACHE_TTL_MS,
        );
    }

    async getOneGraphQL(id: string): Promise<GraphQLRouteRecord | null> {
        return this.cacheManager.wrap(
            CACHE_KEYS.route.getOneGraphQL(id),
            async () => {
                const lookupId = toLookupRouteId(id);
                const [route] = await this.loadGraphQLRoutesByIds([lookupId]);

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
        const classifiedVehicleType = classifiedRoute.vehicleType
            ? (CLASSIFIED_VEHICLE_TYPE_TO_GRAPHQL[
                  classifiedRoute.vehicleType
              ] ?? null)
            : null;

        if (classifiedVehicleType) {
            return classifiedVehicleType;
        }

        return getVehicleTypeFromGtfsType(gtfsRouteType) ?? VehicleType.BUS;
    }
}
