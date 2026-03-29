import { Prisma, type PrismaClient } from "@metro-now/database";

import type {
    SyncPersistenceResult,
    SyncSnapshot,
    SyncedGtfsRoute,
    SyncedGtfsRouteStop,
    SyncedPlatform,
    SyncedPlatformRoute,
    SyncedRoute,
    SyncedStop,
} from "../types/sync.types";
import { getSyncCounts } from "../types/sync.types";

const LOCK_KEY = BigInt(4_241_001);
const ENTITY_BATCH_SIZE = 100;
const RELATION_BATCH_SIZE = 500;

type TransactionClient = Prisma.TransactionClient;

export class SyncRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async persist(snapshot: SyncSnapshot): Promise<SyncPersistenceResult> {
        return await this.prisma.$transaction(
            async (transaction) => {
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
            },
            {
                maxWait: 10 * 1_000,
                timeout: 20 * 60 * 1_000,
            },
        );
    }

    private async persistSnapshot(
        transaction: TransactionClient,
        snapshot: SyncSnapshot,
    ): Promise<void> {
        await this.upsertStops(transaction, snapshot.stops);
        await this.upsertRoutes(transaction, snapshot.routes);
        await this.upsertPlatforms(transaction, snapshot.platforms);
        await this.upsertGtfsRoutes(transaction, snapshot.gtfsRoutes);
        await this.syncPlatformRoutes(transaction, snapshot.platformRoutes);
        await this.syncGtfsRouteStops(transaction, snapshot.gtfsRouteStops);
        await this.deleteStalePlatforms(transaction, snapshot.platforms);
        await this.deleteStaleRoutes(transaction, snapshot.routes);
        await this.deleteStaleStops(transaction, snapshot.stops);
        await this.deleteStaleGtfsRoutes(transaction, snapshot.gtfsRoutes);
    }

    private async upsertStops(
        transaction: TransactionClient,
        stops: SyncedStop[],
    ): Promise<void> {
        await this.processInBatches(stops, ENTITY_BATCH_SIZE, async (chunk) => {
            await Promise.all(
                chunk.map((stop) =>
                    transaction.stop.upsert({
                        where: { id: stop.id },
                        update: {
                            name: stop.name,
                            avgLatitude: stop.avgLatitude,
                            avgLongitude: stop.avgLongitude,
                        },
                        create: stop,
                    }),
                ),
            );
        });
    }

    private async upsertRoutes(
        transaction: TransactionClient,
        routes: SyncedRoute[],
    ): Promise<void> {
        await this.processInBatches(routes, ENTITY_BATCH_SIZE, async (chunk) => {
            await Promise.all(
                chunk.map((route) =>
                    transaction.route.upsert({
                        where: { id: route.id },
                        update: {
                            name: route.name,
                            vehicleType: route.vehicleType,
                            isNight: route.isNight,
                        },
                        create: route,
                    }),
                ),
            );
        });
    }

    private async upsertPlatforms(
        transaction: TransactionClient,
        platforms: SyncedPlatform[],
    ): Promise<void> {
        await this.processInBatches(
            platforms,
            ENTITY_BATCH_SIZE,
            async (chunk) => {
                await Promise.all(
                    chunk.map((platform) =>
                        transaction.platform.upsert({
                            where: { id: platform.id },
                            update: {
                                name: platform.name,
                                code: platform.code,
                                isMetro: platform.isMetro,
                                latitude: platform.latitude,
                                longitude: platform.longitude,
                                stopId: platform.stopId,
                            },
                            create: platform,
                        }),
                    ),
                );
            },
        );
    }

    private async upsertGtfsRoutes(
        transaction: TransactionClient,
        gtfsRoutes: SyncedGtfsRoute[],
    ): Promise<void> {
        await this.processInBatches(
            gtfsRoutes,
            ENTITY_BATCH_SIZE,
            async (chunk) => {
                await Promise.all(
                    chunk.map((gtfsRoute) =>
                        transaction.gtfsRoute.upsert({
                            where: { id: gtfsRoute.id },
                            update: {
                                shortName: gtfsRoute.shortName,
                                longName: gtfsRoute.longName,
                                type: gtfsRoute.type,
                                color: gtfsRoute.color,
                                isNight: gtfsRoute.isNight,
                                url: gtfsRoute.url,
                            },
                            create: gtfsRoute,
                        }),
                    ),
                );
            },
        );
    }

    private async syncPlatformRoutes(
        transaction: TransactionClient,
        platformRoutes: SyncedPlatformRoute[],
    ): Promise<void> {
        const existingRelations = await transaction.platformsOnRoutes.findMany({
            select: {
                platformId: true,
                routeId: true,
            },
        });
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
                await transaction.platformsOnRoutes.createMany({
                    data: chunk,
                    skipDuplicates: true,
                });
            },
        );
        await this.processInBatches(
            relationsToDelete,
            RELATION_BATCH_SIZE,
            async (chunk) => {
                if (chunk.length === 0) {
                    return;
                }

                await transaction.platformsOnRoutes.deleteMany({
                    where: {
                        OR: chunk.map((relation) => ({
                            platformId: relation.platformId,
                            routeId: relation.routeId,
                        })),
                    },
                });
            },
        );
    }

    private async syncGtfsRouteStops(
        transaction: TransactionClient,
        gtfsRouteStops: SyncedGtfsRouteStop[],
    ): Promise<void> {
        const existingRouteStops = await transaction.gtfsRouteStop.findMany({
            select: {
                routeId: true,
                directionId: true,
                stopId: true,
                stopSequence: true,
            },
        });
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
                await transaction.gtfsRouteStop.createMany({
                    data: chunk.map((routeStop) => ({
                        routeId: routeStop.routeId,
                        directionId: routeStop.directionId,
                        stopId: routeStop.platformId,
                        stopSequence: routeStop.stopSequence,
                    })),
                    skipDuplicates: true,
                });
            },
        );
        await this.processInBatches(
            routeStopsToDelete,
            RELATION_BATCH_SIZE,
            async (chunk) => {
                if (chunk.length === 0) {
                    return;
                }

                await transaction.gtfsRouteStop.deleteMany({
                    where: {
                        OR: chunk.map((routeStop) => ({
                            routeId: routeStop.routeId,
                            directionId: routeStop.directionId,
                            stopId: routeStop.stopId,
                            stopSequence: routeStop.stopSequence,
                        })),
                    },
                });
            },
        );
    }

    private async deleteStalePlatforms(
        transaction: TransactionClient,
        platforms: SyncedPlatform[],
    ): Promise<void> {
        const incomingIds = new Set(platforms.map((platform) => platform.id));
        const staleIds = (
            await transaction.platform.findMany({
                select: { id: true },
            })
        )
            .map(({ id }) => id)
            .filter((id) => !incomingIds.has(id));

        await this.deleteByIds(transaction.platform, staleIds);
    }

    private async deleteStaleRoutes(
        transaction: TransactionClient,
        routes: SyncedRoute[],
    ): Promise<void> {
        const incomingIds = new Set(routes.map((route) => route.id));
        const staleIds = (
            await transaction.route.findMany({
                select: { id: true },
            })
        )
            .map(({ id }) => id)
            .filter((id) => !incomingIds.has(id));

        await this.deleteByIds(transaction.route, staleIds);
    }

    private async deleteStaleStops(
        transaction: TransactionClient,
        stops: SyncedStop[],
    ): Promise<void> {
        const incomingIds = new Set(stops.map((stop) => stop.id));
        const staleIds = (
            await transaction.stop.findMany({
                select: { id: true },
            })
        )
            .map(({ id }) => id)
            .filter((id) => !incomingIds.has(id));

        await this.deleteByIds(transaction.stop, staleIds);
    }

    private async deleteStaleGtfsRoutes(
        transaction: TransactionClient,
        gtfsRoutes: SyncedGtfsRoute[],
    ): Promise<void> {
        const incomingIds = new Set(gtfsRoutes.map((route) => route.id));
        const staleIds = (
            await transaction.gtfsRoute.findMany({
                select: { id: true },
            })
        )
            .map(({ id }) => id)
            .filter((id) => !incomingIds.has(id));

        await this.deleteByIds(transaction.gtfsRoute, staleIds);
    }

    private async deleteByIds(
        model: {
            deleteMany(args: { where: { id: { in: string[] } } }): Promise<unknown>;
        },
        ids: string[],
    ): Promise<void> {
        await this.processInBatches(ids, RELATION_BATCH_SIZE, async (chunk) => {
            if (chunk.length === 0) {
                return;
            }

            await model.deleteMany({
                where: {
                    id: {
                        in: chunk,
                    },
                },
            });
        });
    }

    private async tryAcquireTransactionLock(
        transaction: TransactionClient,
    ): Promise<boolean> {
        const [result] = await transaction.$queryRaw<Array<{ acquired: boolean }>>(
            Prisma.sql`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS acquired`,
        );

        return result?.acquired ?? false;
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
