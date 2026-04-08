import { randomUUID } from "node:crypto";
import {
    type DatabaseClient,
    type DatabaseTransaction,
    type NewGtfsRoute,
    type NewGtfsRouteShape,
    type NewGtfsRouteStop,
    type NewPlatform,
    type NewPlatformsOnRoutes,
    type NewRoute,
    type NewStop,
    sql,
} from "@metro-now/database";

import type {
    SyncPersistenceResult,
    SyncSnapshot,
    SyncedGtfsRoute,
    SyncedGtfsRouteShape,
    SyncedGtfsRouteStop,
    SyncedPlatform,
    SyncedPlatformRoute,
    SyncedRoute,
    SyncedStop,
} from "../types/sync.types";
import { getSyncCounts } from "../types/sync.types";
import { logger } from "../utils/logger";

const LOCK_KEY = BigInt(4_241_001);
const ENTITY_BATCH_SIZE = 100;
const RELATION_BATCH_SIZE = 500;

type IdTableName = "GtfsRoute" | "Platform" | "Route" | "Stop";

export class SyncRepository {
    constructor(private readonly db: DatabaseClient) {}

    async persist(snapshot: SyncSnapshot): Promise<SyncPersistenceResult> {
        return this.db.transaction().execute(async (transaction) => {
            await this.configureTransaction(transaction);

            const lockAcquired =
                await this.tryAcquireTransactionLock(transaction);

            if (!lockAcquired) {
                return {
                    status: "skipped",
                    reason: "A different dataloader instance is already syncing",
                };
            }

            await this.persistSnapshot(transaction, snapshot);

            return {
                status: "success",
                counts: getSyncCounts(snapshot),
            };
        });
    }

    private async configureTransaction(
        transaction: DatabaseTransaction,
    ): Promise<void> {
        await sql`SET LOCAL lock_timeout = '10s'`.execute(transaction);
        await sql`SET LOCAL statement_timeout = '20min'`.execute(transaction);
    }

    private async persistSnapshot(
        transaction: DatabaseTransaction,
        snapshot: SyncSnapshot,
    ): Promise<void> {
        await this.upsertStops(transaction, snapshot.stops);
        await this.upsertRoutes(transaction, snapshot.routes);
        await this.upsertPlatforms(transaction, snapshot.platforms);
        await this.upsertGtfsRoutes(transaction, snapshot.gtfsRoutes);
        await this.syncPlatformRoutes(transaction, snapshot.platformRoutes);
        await this.syncGtfsRouteStops(transaction, snapshot.gtfsRouteStops);
        await this.syncGtfsRouteShapes(transaction, snapshot.gtfsRouteShapes);
        await this.deleteStalePlatforms(transaction, snapshot.platforms);
        await this.deleteStaleRoutes(transaction, snapshot.routes);
        await this.deleteStaleStops(transaction, snapshot.stops);
        await this.deleteStaleGtfsRoutes(transaction, snapshot.gtfsRoutes);
    }

    private async upsertStops(
        transaction: DatabaseTransaction,
        stops: SyncedStop[],
    ): Promise<void> {
        await this.processInBatches(stops, ENTITY_BATCH_SIZE, async (chunk) => {
            const timestamp = new Date();
            const values: NewStop[] = chunk.map((stop) => ({
                id: stop.id,
                name: stop.name,
                avgLatitude: stop.avgLatitude,
                avgLongitude: stop.avgLongitude,
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction
                .insertInto("Stop")
                .values(values)
                .onConflict((conflict) =>
                    conflict.column("id").doUpdateSet((expressionBuilder) => ({
                        name: expressionBuilder.ref("excluded.name"),
                        avgLatitude: expressionBuilder.ref(
                            "excluded.avgLatitude",
                        ),
                        avgLongitude: expressionBuilder.ref(
                            "excluded.avgLongitude",
                        ),
                        updatedAt: sql`now()`,
                    })),
                )
                .execute();
        });
    }

    private async upsertRoutes(
        transaction: DatabaseTransaction,
        routes: SyncedRoute[],
    ): Promise<void> {
        await this.processInBatches(
            routes,
            ENTITY_BATCH_SIZE,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewRoute[] = chunk.map((route) => ({
                    id: route.id,
                    name: route.name,
                    vehicleType: route.vehicleType,
                    isNight: route.isNight,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

                await transaction
                    .insertInto("Route")
                    .values(values)
                    .onConflict((conflict) =>
                        conflict
                            .column("id")
                            .doUpdateSet((expressionBuilder) => ({
                                name: expressionBuilder.ref("excluded.name"),
                                vehicleType: expressionBuilder.ref(
                                    "excluded.vehicleType",
                                ),
                                isNight:
                                    expressionBuilder.ref("excluded.isNight"),
                                updatedAt: sql`now()`,
                            })),
                    )
                    .execute();
            },
        );
    }

    private async upsertPlatforms(
        transaction: DatabaseTransaction,
        platforms: SyncedPlatform[],
    ): Promise<void> {
        await this.processInBatches(
            platforms,
            ENTITY_BATCH_SIZE,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewPlatform[] = chunk.map((platform) => ({
                    id: platform.id,
                    name: platform.name,
                    code: platform.code,
                    isMetro: platform.isMetro,
                    latitude: platform.latitude,
                    longitude: platform.longitude,
                    stopId: platform.stopId,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

                await transaction
                    .insertInto("Platform")
                    .values(values)
                    .onConflict((conflict) =>
                        conflict
                            .column("id")
                            .doUpdateSet((expressionBuilder) => ({
                                name: expressionBuilder.ref("excluded.name"),
                                code: expressionBuilder.ref("excluded.code"),
                                isMetro:
                                    expressionBuilder.ref("excluded.isMetro"),
                                latitude:
                                    expressionBuilder.ref("excluded.latitude"),
                                longitude:
                                    expressionBuilder.ref("excluded.longitude"),
                                stopId: expressionBuilder.ref(
                                    "excluded.stopId",
                                ),
                                updatedAt: sql`now()`,
                            })),
                    )
                    .execute();
            },
        );
    }

    private async upsertGtfsRoutes(
        transaction: DatabaseTransaction,
        gtfsRoutes: SyncedGtfsRoute[],
    ): Promise<void> {
        await this.processInBatches(
            gtfsRoutes,
            ENTITY_BATCH_SIZE,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsRoute[] = chunk.map((gtfsRoute) => ({
                    id: gtfsRoute.id,
                    shortName: gtfsRoute.shortName,
                    longName: gtfsRoute.longName,
                    type: gtfsRoute.type,
                    color: gtfsRoute.color,
                    isNight: gtfsRoute.isNight,
                    url: gtfsRoute.url,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

                await transaction
                    .insertInto("GtfsRoute")
                    .values(values)
                    .onConflict((conflict) =>
                        conflict
                            .column("id")
                            .doUpdateSet((expressionBuilder) => ({
                                shortName:
                                    expressionBuilder.ref("excluded.shortName"),
                                longName:
                                    expressionBuilder.ref("excluded.longName"),
                                type: expressionBuilder.ref("excluded.type"),
                                color: expressionBuilder.ref("excluded.color"),
                                isNight:
                                    expressionBuilder.ref("excluded.isNight"),
                                url: expressionBuilder.ref("excluded.url"),
                                updatedAt: sql`now()`,
                            })),
                    )
                    .execute();
            },
        );
    }

    private async syncPlatformRoutes(
        transaction: DatabaseTransaction,
        platformRoutes: SyncedPlatformRoute[],
    ): Promise<void> {
        const existingRelations = await transaction
            .selectFrom("PlatformsOnRoutes")
            .select(["platformId", "routeId"])
            .execute();
        const incomingKeys = new Set(
            platformRoutes.map((relation) =>
                this.getPlatformRouteKey(relation),
            ),
        );
        const existingKeys = new Set(
            existingRelations.map((relation) =>
                this.getPlatformRouteKey(relation),
            ),
        );
        const relationsToCreate = platformRoutes.filter(
            (relation) => !existingKeys.has(this.getPlatformRouteKey(relation)),
        );
        const relationsToDelete = existingRelations.filter(
            (relation) => !incomingKeys.has(this.getPlatformRouteKey(relation)),
        );

        await this.processInBatches(
            relationsToCreate,
            RELATION_BATCH_SIZE,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewPlatformsOnRoutes[] = chunk.map(
                    (relation) => ({
                        id: randomUUID(),
                        platformId: relation.platformId,
                        routeId: relation.routeId,
                        createdAt: timestamp,
                        updatedAt: timestamp,
                    }),
                );

                await transaction
                    .insertInto("PlatformsOnRoutes")
                    .values(values)
                    .onConflict((conflict) =>
                        conflict.columns(["platformId", "routeId"]).doNothing(),
                    )
                    .execute();
            },
        );
        await this.processInBatches(
            relationsToDelete,
            RELATION_BATCH_SIZE,
            async (chunk) => {
                if (chunk.length === 0) {
                    return;
                }

                await transaction
                    .deleteFrom("PlatformsOnRoutes")
                    .where((expressionBuilder) =>
                        expressionBuilder.or(
                            chunk.map((relation) =>
                                expressionBuilder.and([
                                    expressionBuilder(
                                        "platformId",
                                        "=",
                                        relation.platformId,
                                    ),
                                    expressionBuilder(
                                        "routeId",
                                        "=",
                                        relation.routeId,
                                    ),
                                ]),
                            ),
                        ),
                    )
                    .execute();
            },
        );
    }

    private async syncGtfsRouteStops(
        transaction: DatabaseTransaction,
        gtfsRouteStops: SyncedGtfsRouteStop[],
    ): Promise<void> {
        const existingRouteStops = await transaction
            .selectFrom("GtfsRouteStop")
            .select(["routeId", "directionId", "stopId", "stopSequence"])
            .execute();
        const incomingKeys = new Set(
            gtfsRouteStops.map((routeStop) =>
                this.getGtfsRouteStopKey(routeStop),
            ),
        );
        const existingKeys = new Set(
            existingRouteStops.map((routeStop) =>
                this.getGtfsRouteStopKey({
                    routeId: routeStop.routeId,
                    directionId: routeStop.directionId,
                    platformId: routeStop.stopId,
                    stopSequence: routeStop.stopSequence,
                }),
            ),
        );
        const routeStopsToCreate = gtfsRouteStops.filter(
            (routeStop) =>
                !existingKeys.has(this.getGtfsRouteStopKey(routeStop)),
        );
        const routeStopsToDelete = existingRouteStops.filter(
            (routeStop) =>
                !incomingKeys.has(
                    this.getGtfsRouteStopKey({
                        routeId: routeStop.routeId,
                        directionId: routeStop.directionId,
                        platformId: routeStop.stopId,
                        stopSequence: routeStop.stopSequence,
                    }),
                ),
        );

        await this.processInBatches(
            routeStopsToCreate,
            RELATION_BATCH_SIZE,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsRouteStop[] = chunk.map((routeStop) => ({
                    id: randomUUID(),
                    routeId: routeStop.routeId,
                    directionId: routeStop.directionId,
                    stopId: routeStop.platformId,
                    stopSequence: routeStop.stopSequence,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

                await transaction
                    .insertInto("GtfsRouteStop")
                    .values(values)
                    .onConflict((conflict) =>
                        conflict
                            .columns([
                                "routeId",
                                "directionId",
                                "stopId",
                                "stopSequence",
                            ])
                            .doNothing(),
                    )
                    .execute();
            },
        );
        await this.processInBatches(
            routeStopsToDelete,
            RELATION_BATCH_SIZE,
            async (chunk) => {
                if (chunk.length === 0) {
                    return;
                }

                await transaction
                    .deleteFrom("GtfsRouteStop")
                    .where((expressionBuilder) =>
                        expressionBuilder.or(
                            chunk.map((routeStop) =>
                                expressionBuilder.and([
                                    expressionBuilder(
                                        "routeId",
                                        "=",
                                        routeStop.routeId,
                                    ),
                                    expressionBuilder(
                                        "directionId",
                                        "=",
                                        routeStop.directionId,
                                    ),
                                    expressionBuilder(
                                        "stopId",
                                        "=",
                                        routeStop.stopId,
                                    ),
                                    expressionBuilder(
                                        "stopSequence",
                                        "=",
                                        routeStop.stopSequence,
                                    ),
                                ]),
                            ),
                        ),
                    )
                    .execute();
            },
        );
    }

    private async syncGtfsRouteShapes(
        transaction: DatabaseTransaction,
        gtfsRouteShapes: SyncedGtfsRouteShape[],
    ): Promise<void> {
        const existingRouteShapes = await transaction
            .selectFrom("GtfsRouteShape")
            .select(["routeId", "directionId", "shapeId"])
            .execute();
        const incomingKeys = new Set(
            gtfsRouteShapes.map((routeShape) =>
                this.getGtfsRouteShapeKey(routeShape),
            ),
        );
        const routeShapesToDelete = existingRouteShapes.filter(
            (routeShape) =>
                !incomingKeys.has(this.getGtfsRouteShapeKey(routeShape)),
        );

        await this.processInBatches(
            gtfsRouteShapes,
            RELATION_BATCH_SIZE,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsRouteShape[] = chunk.map((routeShape) => ({
                    id: randomUUID(),
                    routeId: routeShape.routeId,
                    directionId: routeShape.directionId,
                    shapeId: routeShape.shapeId,
                    tripCount: routeShape.tripCount,
                    isPrimary: routeShape.isPrimary,
                    geoJson: routeShape.geoJson,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

                await transaction
                    .insertInto("GtfsRouteShape")
                    .values(values)
                    .onConflict((conflict) =>
                        conflict
                            .columns(["routeId", "directionId", "shapeId"])
                            .doUpdateSet((expressionBuilder) => ({
                                tripCount:
                                    expressionBuilder.ref("excluded.tripCount"),
                                isPrimary:
                                    expressionBuilder.ref("excluded.isPrimary"),
                                geoJson:
                                    expressionBuilder.ref("excluded.geoJson"),
                                updatedAt: sql`now()`,
                            })),
                    )
                    .execute();
            },
        );
        await this.processInBatches(
            routeShapesToDelete,
            RELATION_BATCH_SIZE,
            async (chunk) => {
                if (chunk.length === 0) {
                    return;
                }

                await transaction
                    .deleteFrom("GtfsRouteShape")
                    .where((expressionBuilder) =>
                        expressionBuilder.or(
                            chunk.map((routeShape) =>
                                expressionBuilder.and([
                                    expressionBuilder(
                                        "routeId",
                                        "=",
                                        routeShape.routeId,
                                    ),
                                    expressionBuilder(
                                        "directionId",
                                        "=",
                                        routeShape.directionId,
                                    ),
                                    expressionBuilder(
                                        "shapeId",
                                        "=",
                                        routeShape.shapeId,
                                    ),
                                ]),
                            ),
                        ),
                    )
                    .execute();
            },
        );
    }

    private async deleteStalePlatforms(
        transaction: DatabaseTransaction,
        platforms: SyncedPlatform[],
    ): Promise<void> {
        const incomingIds = new Set(platforms.map((platform) => platform.id));
        const staleIds = (await this.selectIds(transaction, "Platform")).filter(
            (id) => !incomingIds.has(id),
        );
        const deletableIds =
            await this.excludePlatformIdsReferencedByGtfsStopTimes(
                transaction,
                staleIds,
            );

        if (deletableIds.length !== staleIds.length) {
            logger.warn(
                "Skipping stale platform deletes protected by GTFS stop times",
                {
                    stalePlatformCount: staleIds.length,
                    blockedPlatformCount: staleIds.length - deletableIds.length,
                    sampleBlockedPlatformIds: staleIds
                        .filter((id) => !deletableIds.includes(id))
                        .slice(0, 10),
                },
            );
        }

        await this.deleteByIds(transaction, "Platform", deletableIds);
    }

    private async deleteStaleRoutes(
        transaction: DatabaseTransaction,
        routes: SyncedRoute[],
    ): Promise<void> {
        const incomingIds = new Set(routes.map((route) => route.id));
        const staleIds = (await this.selectIds(transaction, "Route")).filter(
            (id) => !incomingIds.has(id),
        );

        await this.deleteByIds(transaction, "Route", staleIds);
    }

    private async deleteStaleStops(
        transaction: DatabaseTransaction,
        stops: SyncedStop[],
    ): Promise<void> {
        const incomingIds = new Set(stops.map((stop) => stop.id));
        const staleIds = (await this.selectIds(transaction, "Stop")).filter(
            (id) => !incomingIds.has(id),
        );

        await this.deleteByIds(transaction, "Stop", staleIds);
    }

    private async deleteStaleGtfsRoutes(
        transaction: DatabaseTransaction,
        gtfsRoutes: SyncedGtfsRoute[],
    ): Promise<void> {
        const incomingIds = new Set(gtfsRoutes.map((route) => route.id));
        const staleIds = (
            await this.selectIds(transaction, "GtfsRoute")
        ).filter((id) => !incomingIds.has(id));

        await this.deleteByIds(transaction, "GtfsRoute", staleIds);
    }

    private async selectIds(
        transaction: DatabaseTransaction,
        tableName: IdTableName,
    ): Promise<string[]> {
        const rows = await transaction
            .selectFrom(tableName)
            .select("id")
            .orderBy("id", "asc")
            .execute();

        return rows.map(({ id }) => id);
    }

    private async deleteByIds(
        transaction: DatabaseTransaction,
        tableName: IdTableName,
        ids: string[],
    ): Promise<void> {
        await this.processInBatches(ids, RELATION_BATCH_SIZE, async (chunk) => {
            if (chunk.length === 0) {
                return;
            }

            await transaction
                .deleteFrom(tableName)
                .where("id", "in", chunk)
                .execute();
        });
    }

    private async tryAcquireTransactionLock(
        transaction: DatabaseTransaction,
    ): Promise<boolean> {
        const result = await sql<{ acquired: boolean }>`
            SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS acquired
        `.execute(transaction);

        return result.rows[0]?.acquired ?? false;
    }

    private async excludePlatformIdsReferencedByGtfsStopTimes(
        transaction: DatabaseTransaction,
        platformIds: string[],
    ): Promise<string[]> {
        if (platformIds.length === 0) {
            return platformIds;
        }

        const gtfsStopTimeTableExists = await this.hasTable(
            transaction,
            "GtfsStopTime",
        );

        if (!gtfsStopTimeTableExists) {
            return platformIds;
        }

        const protectedPlatformIds = new Set<string>();

        await this.processInBatches(
            platformIds,
            RELATION_BATCH_SIZE,
            async (chunk) => {
                const rows = await transaction
                    .selectFrom("GtfsStopTime")
                    .select("platformId")
                    .distinct()
                    .where("platformId", "is not", null)
                    .where("platformId", "in", chunk)
                    .execute();

                for (const { platformId } of rows) {
                    if (platformId) {
                        protectedPlatformIds.add(platformId);
                    }
                }
            },
        );

        return platformIds.filter((id) => !protectedPlatformIds.has(id));
    }

    private async hasTable(
        transaction: DatabaseTransaction,
        tableName: string,
    ): Promise<boolean> {
        const result = await sql<{ exists: boolean }>`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = ${tableName}
            ) AS exists
        `.execute(transaction);

        return Boolean(result.rows[0]?.exists);
    }

    private getPlatformRouteKey(relation: SyncedPlatformRoute): string {
        return `${relation.platformId}::${relation.routeId}`;
    }

    private getGtfsRouteStopKey(routeStop: SyncedGtfsRouteStop): string {
        return [
            routeStop.routeId,
            routeStop.directionId,
            routeStop.platformId,
            routeStop.stopSequence,
        ].join("::");
    }

    private getGtfsRouteShapeKey(
        routeShape: Pick<
            SyncedGtfsRouteShape,
            "routeId" | "directionId" | "shapeId"
        >,
    ): string {
        return [
            routeShape.routeId,
            routeShape.directionId,
            routeShape.shapeId,
        ].join("::");
    }

    private async processInBatches<T>(
        items: T[],
        batchSize: number,
        callback: (chunk: T[]) => Promise<void>,
    ): Promise<void> {
        for (let index = 0; index < items.length; index += batchSize) {
            await callback(items.slice(index, index + batchSize));
        }
    }
}
