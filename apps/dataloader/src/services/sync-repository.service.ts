import { randomUUID } from "node:crypto";
import {
    type DatabaseClient,
    type DatabaseTransaction,
    type NewGtfsCalendar,
    type NewGtfsCalendarDate,
    type NewGtfsRoute,
    type NewGtfsRouteShape,
    type NewGtfsRouteStop,
    type NewGtfsStationEntrance,
    type NewGtfsStopTime,
    type NewGtfsTransfer,
    type NewGtfsTrip,
    type NewPlatform,
    type NewPlatformsOnRoutes,
    type NewRoute,
    type NewStop,
    sql,
} from "@metro-now/database";

import type {
    SyncPersistenceResult,
    SyncSnapshot,
    SyncedGtfsCalendar,
    SyncedGtfsCalendarDate,
    SyncedGtfsRoute,
    SyncedGtfsRouteShape,
    SyncedGtfsRouteStop,
    SyncedGtfsStationEntrance,
    SyncedGtfsStopTime,
    SyncedGtfsTransfer,
    SyncedGtfsTrip,
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

type SyncRepositoryOptions = {
    entityBatchSize?: number;
    relationBatchSize?: number;
    batchDelayMs?: number;
};

type IdTableName =
    | "GtfsRoute"
    | "GtfsCalendar"
    | "GtfsCalendarDate"
    | "GtfsStationEntrance"
    | "GtfsStopTime"
    | "GtfsTransfer"
    | "GtfsTrip"
    | "Platform"
    | "Route"
    | "Stop";

export class SyncRepository {
    private readonly entityBatchSize: number;
    private readonly relationBatchSize: number;
    private readonly batchDelayMs: number;

    constructor(
        private readonly db: DatabaseClient,
        options: SyncRepositoryOptions = {},
    ) {
        this.entityBatchSize = options.entityBatchSize ?? ENTITY_BATCH_SIZE;
        this.relationBatchSize =
            options.relationBatchSize ?? RELATION_BATCH_SIZE;
        this.batchDelayMs = options.batchDelayMs ?? 0;
    }

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

            const changedEntities =
                await this.persistSnapshot(transaction, snapshot);

            return {
                status: "success",
                counts: getSyncCounts(snapshot),
                changedEntities,
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
    ): Promise<string[]> {
        const changed = new Set<string>();

        await this.upsertStops(transaction, snapshot.stops);
        await this.upsertRoutes(transaction, snapshot.routes);
        await this.upsertPlatforms(transaction, snapshot.platforms);
        await this.upsertGtfsRoutes(transaction, snapshot.gtfsRoutes);
        await this.upsertGtfsStationEntrances(
            transaction,
            snapshot.gtfsStationEntrances,
        );
        if (await this.replaceGtfsTrips(transaction, snapshot.gtfsTrips)) {
            changed.add("gtfsTrips");
        }
        if (
            await this.replaceGtfsStopTimes(transaction, snapshot.gtfsStopTimes)
        ) {
            changed.add("gtfsStopTimes");
        }
        if (
            await this.replaceGtfsCalendars(transaction, snapshot.gtfsCalendars)
        ) {
            changed.add("gtfsCalendars");
        }
        if (
            await this.replaceGtfsCalendarDates(
                transaction,
                snapshot.gtfsCalendarDates,
            )
        ) {
            changed.add("gtfsCalendarDates");
        }
        if (
            await this.replaceGtfsTransfers(transaction, snapshot.gtfsTransfers)
        ) {
            changed.add("gtfsTransfers");
        }

        if (
            await this.syncPlatformRoutes(
                transaction,
                snapshot.platformRoutes,
            )
        ) {
            changed.add("platformRoutes");
        }

        if (
            await this.syncGtfsRouteStops(
                transaction,
                snapshot.gtfsRouteStops,
            )
        ) {
            changed.add("gtfsRouteStops");
        }

        if (
            await this.syncGtfsRouteShapes(
                transaction,
                snapshot.gtfsRouteShapes,
            )
        ) {
            changed.add("gtfsRouteShapes");
        }

        if (
            await this.deleteStaleGtfsStationEntrances(
                transaction,
                snapshot.gtfsStationEntrances,
            )
        ) {
            changed.add("gtfsStationEntrances");
        }

        if (
            await this.deleteStalePlatforms(transaction, snapshot.platforms)
        ) {
            changed.add("platforms");
        }

        if (await this.deleteStaleRoutes(transaction, snapshot.routes)) {
            changed.add("routes");
        }

        if (await this.deleteStaleStops(transaction, snapshot.stops)) {
            changed.add("stops");
        }

        if (
            await this.deleteStaleGtfsRoutes(transaction, snapshot.gtfsRoutes)
        ) {
            changed.add("gtfsRoutes");
        }

        // Upserts with ON CONFLICT DO UPDATE always touch rows, so we detect
        // changes by checking if any row's updatedAt was set to the current
        // transaction time (i.e., it was actually inserted or updated).
        // For simplicity, we check if any rows exist at all — the upsert data
        // came from the live PID API, so any non-empty upsert is a potential change.
        if (snapshot.stops.length > 0) changed.add("stops");
        if (snapshot.platforms.length > 0) changed.add("platforms");
        if (snapshot.routes.length > 0) changed.add("routes");
        if (snapshot.gtfsRoutes.length > 0) changed.add("gtfsRoutes");
        if (snapshot.gtfsStationEntrances.length > 0)
            changed.add("gtfsStationEntrances");
        if (snapshot.gtfsTrips.length > 0) changed.add("gtfsTrips");
        if (snapshot.gtfsStopTimes.length > 0) changed.add("gtfsStopTimes");
        if (snapshot.gtfsCalendars.length > 0) changed.add("gtfsCalendars");
        if (snapshot.gtfsCalendarDates.length > 0)
            changed.add("gtfsCalendarDates");
        if (snapshot.gtfsTransfers.length > 0) changed.add("gtfsTransfers");

        return [...changed];
    }

    private async upsertStops(
        transaction: DatabaseTransaction,
        stops: SyncedStop[],
    ): Promise<void> {
        await this.processInBatches(
            stops,
            this.entityBatchSize,
            async (chunk) => {
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
                        conflict
                            .column("id")
                            .doUpdateSet((expressionBuilder) => ({
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
            },
        );
    }

    private async upsertRoutes(
        transaction: DatabaseTransaction,
        routes: SyncedRoute[],
    ): Promise<void> {
        await this.processInBatches(
            routes,
            this.entityBatchSize,
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
            this.entityBatchSize,
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
            this.entityBatchSize,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsRoute[] = chunk.map((gtfsRoute) => ({
                    id: gtfsRoute.id,
                    feedId: gtfsRoute.feedId,
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
                            .columns(["feedId", "id"])
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

    private async upsertGtfsStationEntrances(
        transaction: DatabaseTransaction,
        gtfsStationEntrances: SyncedGtfsStationEntrance[],
    ): Promise<void> {
        await this.processInBatches(
            gtfsStationEntrances,
            this.entityBatchSize,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsStationEntrance[] = chunk.map(
                    (entrance) => ({
                        id: entrance.id,
                        feedId: entrance.feedId,
                        stopId: entrance.stopId,
                        parentStationId: entrance.parentStationId,
                        name: entrance.name,
                        latitude: entrance.latitude,
                        longitude: entrance.longitude,
                        createdAt: timestamp,
                        updatedAt: timestamp,
                    }),
                );

                await transaction
                    .insertInto("GtfsStationEntrance")
                    .values(values)
                    .onConflict((conflict) =>
                        conflict
                            .columns(["feedId", "id"])
                            .doUpdateSet((expressionBuilder) => ({
                                stopId: expressionBuilder.ref(
                                    "excluded.stopId",
                                ),
                                parentStationId: expressionBuilder.ref(
                                    "excluded.parentStationId",
                                ),
                                name: expressionBuilder.ref("excluded.name"),
                                latitude:
                                    expressionBuilder.ref("excluded.latitude"),
                                longitude:
                                    expressionBuilder.ref("excluded.longitude"),
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
    ): Promise<boolean> {
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
            this.relationBatchSize,
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
            this.relationBatchSize,
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

        return relationsToCreate.length > 0 || relationsToDelete.length > 0;
    }

    private async syncGtfsRouteStops(
        transaction: DatabaseTransaction,
        gtfsRouteStops: SyncedGtfsRouteStop[],
    ): Promise<boolean> {
        const existingRouteStops = await transaction
            .selectFrom("GtfsRouteStop")
            .select([
                "feedId",
                "routeId",
                "directionId",
                "stopId",
                "stopSequence",
            ])
            .execute();
        const incomingKeys = new Set(
            gtfsRouteStops.map((routeStop) =>
                this.getGtfsRouteStopKey(routeStop),
            ),
        );
        const existingKeys = new Set(
            existingRouteStops.map((routeStop) =>
                this.getGtfsRouteStopKey({
                    feedId: routeStop.feedId,
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
                        feedId: routeStop.feedId,
                        routeId: routeStop.routeId,
                        directionId: routeStop.directionId,
                        platformId: routeStop.stopId,
                        stopSequence: routeStop.stopSequence,
                    }),
                ),
        );

        await this.processInBatches(
            routeStopsToCreate,
            this.relationBatchSize,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsRouteStop[] = chunk.map((routeStop) => ({
                    feedId: routeStop.feedId,
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
                                "feedId",
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
            this.relationBatchSize,
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
                                        "feedId",
                                        "=",
                                        routeStop.feedId,
                                    ),
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

        return routeStopsToCreate.length > 0 || routeStopsToDelete.length > 0;
    }

    private async syncGtfsRouteShapes(
        transaction: DatabaseTransaction,
        gtfsRouteShapes: SyncedGtfsRouteShape[],
    ): Promise<boolean> {
        const existingRouteShapes = await transaction
            .selectFrom("GtfsRouteShape")
            .select(["feedId", "routeId", "directionId", "shapeId"])
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
            this.relationBatchSize,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsRouteShape[] = chunk.map((routeShape) => ({
                    feedId: routeShape.feedId,
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
                            .columns([
                                "feedId",
                                "routeId",
                                "directionId",
                                "shapeId",
                            ])
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
            this.relationBatchSize,
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
                                        "feedId",
                                        "=",
                                        routeShape.feedId,
                                    ),
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

        return gtfsRouteShapes.length > 0 || routeShapesToDelete.length > 0;
    }

    private async replaceGtfsTrips(
        transaction: DatabaseTransaction,
        gtfsTrips: SyncedGtfsTrip[],
    ): Promise<boolean> {
        const hadRows = await this.hasRows(transaction, "GtfsTrip");

        await transaction.deleteFrom("GtfsTrip").execute();

        await this.processInBatches(
            gtfsTrips,
            this.relationBatchSize,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsTrip[] = chunk.map((trip) => ({
                    id: trip.id,
                    feedId: trip.feedId,
                    tripId: trip.tripId,
                    routeId: trip.routeId,
                    serviceId: trip.serviceId,
                    directionId: trip.directionId,
                    shapeId: trip.shapeId,
                    tripHeadsign: trip.tripHeadsign,
                    blockId: trip.blockId,
                    wheelchairAccessible: trip.wheelchairAccessible,
                    bikesAllowed: trip.bikesAllowed,
                    rawData: trip.rawData,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

                if (values.length > 0) {
                    await transaction.insertInto("GtfsTrip").values(values).execute();
                }
            },
        );

        return hadRows || gtfsTrips.length > 0;
    }

    private async replaceGtfsStopTimes(
        transaction: DatabaseTransaction,
        gtfsStopTimes: SyncedGtfsStopTime[],
    ): Promise<boolean> {
        const hadRows = await this.hasRows(transaction, "GtfsStopTime");

        await transaction.deleteFrom("GtfsStopTime").execute();

        await this.processInBatches(
            gtfsStopTimes,
            this.relationBatchSize,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsStopTime[] = chunk.map((stopTime) => ({
                    id: stopTime.id,
                    feedId: stopTime.feedId,
                    tripId: stopTime.tripId,
                    stopId: stopTime.stopId,
                    platformId: stopTime.platformId,
                    stopSequence: stopTime.stopSequence,
                    arrivalTime: stopTime.arrivalTime,
                    departureTime: stopTime.departureTime,
                    pickupType: stopTime.pickupType,
                    dropOffType: stopTime.dropOffType,
                    timepoint: stopTime.timepoint,
                    rawData: stopTime.rawData,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

                if (values.length > 0) {
                    await transaction
                        .insertInto("GtfsStopTime")
                        .values(values)
                        .execute();
                }
            },
        );

        return hadRows || gtfsStopTimes.length > 0;
    }

    private async replaceGtfsCalendars(
        transaction: DatabaseTransaction,
        gtfsCalendars: SyncedGtfsCalendar[],
    ): Promise<boolean> {
        const hadRows = await this.hasRows(transaction, "GtfsCalendar");

        await transaction.deleteFrom("GtfsCalendar").execute();

        await this.processInBatches(
            gtfsCalendars,
            this.relationBatchSize,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsCalendar[] = chunk.map((calendar) => ({
                    id: calendar.id,
                    feedId: calendar.feedId,
                    serviceId: calendar.serviceId,
                    monday: calendar.monday,
                    tuesday: calendar.tuesday,
                    wednesday: calendar.wednesday,
                    thursday: calendar.thursday,
                    friday: calendar.friday,
                    saturday: calendar.saturday,
                    sunday: calendar.sunday,
                    startDate: calendar.startDate,
                    endDate: calendar.endDate,
                    rawData: calendar.rawData,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

                if (values.length > 0) {
                    await transaction
                        .insertInto("GtfsCalendar")
                        .values(values)
                        .execute();
                }
            },
        );

        return hadRows || gtfsCalendars.length > 0;
    }

    private async replaceGtfsCalendarDates(
        transaction: DatabaseTransaction,
        gtfsCalendarDates: SyncedGtfsCalendarDate[],
    ): Promise<boolean> {
        const hadRows = await this.hasRows(transaction, "GtfsCalendarDate");

        await transaction.deleteFrom("GtfsCalendarDate").execute();

        await this.processInBatches(
            gtfsCalendarDates,
            this.relationBatchSize,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsCalendarDate[] = chunk.map(
                    (calendarDate) => ({
                        id: calendarDate.id,
                        feedId: calendarDate.feedId,
                        serviceId: calendarDate.serviceId,
                        date: calendarDate.date,
                        exceptionType: calendarDate.exceptionType,
                        rawData: calendarDate.rawData,
                        createdAt: timestamp,
                        updatedAt: timestamp,
                    }),
                );

                if (values.length > 0) {
                    await transaction
                        .insertInto("GtfsCalendarDate")
                        .values(values)
                        .execute();
                }
            },
        );

        return hadRows || gtfsCalendarDates.length > 0;
    }

    private async replaceGtfsTransfers(
        transaction: DatabaseTransaction,
        gtfsTransfers: SyncedGtfsTransfer[],
    ): Promise<boolean> {
        const hadRows = await this.hasRows(transaction, "GtfsTransfer");

        await transaction.deleteFrom("GtfsTransfer").execute();

        await this.processInBatches(
            gtfsTransfers,
            this.relationBatchSize,
            async (chunk) => {
                const timestamp = new Date();
                const values: NewGtfsTransfer[] = chunk.map((transfer) => ({
                    id: transfer.id,
                    feedId: transfer.feedId,
                    fromStopId: transfer.fromStopId,
                    toStopId: transfer.toStopId,
                    fromRouteId: transfer.fromRouteId,
                    toRouteId: transfer.toRouteId,
                    fromTripId: transfer.fromTripId,
                    toTripId: transfer.toTripId,
                    transferType: transfer.transferType,
                    minTransferTime: transfer.minTransferTime,
                    rawData: transfer.rawData,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                }));

                if (values.length > 0) {
                    await transaction
                        .insertInto("GtfsTransfer")
                        .values(values)
                        .execute();
                }
            },
        );

        return hadRows || gtfsTransfers.length > 0;
    }

    private async deleteStalePlatforms(
        transaction: DatabaseTransaction,
        platforms: SyncedPlatform[],
    ): Promise<boolean> {
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

        return deletableIds.length > 0;
    }

    private async deleteStaleRoutes(
        transaction: DatabaseTransaction,
        routes: SyncedRoute[],
    ): Promise<boolean> {
        const incomingIds = new Set(routes.map((route) => route.id));
        const staleIds = (await this.selectIds(transaction, "Route")).filter(
            (id) => !incomingIds.has(id),
        );

        await this.deleteByIds(transaction, "Route", staleIds);

        return staleIds.length > 0;
    }

    private async deleteStaleStops(
        transaction: DatabaseTransaction,
        stops: SyncedStop[],
    ): Promise<boolean> {
        const incomingIds = new Set(stops.map((stop) => stop.id));
        const staleIds = (await this.selectIds(transaction, "Stop")).filter(
            (id) => !incomingIds.has(id),
        );

        await this.deleteByIds(transaction, "Stop", staleIds);

        return staleIds.length > 0;
    }

    private async deleteStaleGtfsRoutes(
        transaction: DatabaseTransaction,
        gtfsRoutes: SyncedGtfsRoute[],
    ): Promise<boolean> {
        const incomingKeys = new Set(
            gtfsRoutes.map((route) => `${route.feedId}::${route.id}`),
        );
        const staleRouteKeys = (
            await transaction
                .selectFrom("GtfsRoute")
                .select(["feedId", "id"])
                .execute()
        ).filter(
            (route) => !incomingKeys.has(`${route.feedId}::${route.id}`),
        );

        await this.processInBatches(
            staleRouteKeys,
            this.relationBatchSize,
            async (chunk) => {
                if (chunk.length === 0) {
                    return;
                }

                await transaction
                    .deleteFrom("GtfsRoute")
                    .where((expressionBuilder) =>
                        expressionBuilder.or(
                            chunk.map((route) =>
                                expressionBuilder.and([
                                    expressionBuilder(
                                        "feedId",
                                        "=",
                                        route.feedId,
                                    ),
                                    expressionBuilder("id", "=", route.id),
                                ]),
                            ),
                        ),
                    )
                    .execute();
            },
        );

        return staleRouteKeys.length > 0;
    }

    private async deleteStaleGtfsStationEntrances(
        transaction: DatabaseTransaction,
        gtfsStationEntrances: SyncedGtfsStationEntrance[],
    ): Promise<boolean> {
        const incomingIds = new Set(
            gtfsStationEntrances.map(
                (entrance) => `${entrance.feedId}::${entrance.id}`,
            ),
        );
        const staleEntrances = (
            await transaction
                .selectFrom("GtfsStationEntrance")
                .select(["feedId", "id"])
                .execute()
        ).filter(
            (entrance) => !incomingIds.has(`${entrance.feedId}::${entrance.id}`),
        );

        await this.processInBatches(
            staleEntrances,
            this.relationBatchSize,
            async (chunk) => {
                if (chunk.length === 0) {
                    return;
                }

                await transaction
                    .deleteFrom("GtfsStationEntrance")
                    .where((expressionBuilder) =>
                        expressionBuilder.or(
                            chunk.map((entrance) =>
                                expressionBuilder.and([
                                    expressionBuilder(
                                        "feedId",
                                        "=",
                                        entrance.feedId,
                                    ),
                                    expressionBuilder("id", "=", entrance.id),
                                ]),
                            ),
                        ),
                    )
                    .execute();
            },
        );

        return staleEntrances.length > 0;
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
        await this.processInBatches(
            ids,
            this.relationBatchSize,
            async (chunk) => {
                if (chunk.length === 0) {
                    return;
                }

                await transaction
                    .deleteFrom(tableName)
                    .where("id", "in", chunk)
                    .execute();
            },
        );
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
            this.relationBatchSize,
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

    private async hasRows(
        transaction: DatabaseTransaction,
        tableName: IdTableName,
    ): Promise<boolean> {
        const row = await transaction
            .selectFrom(tableName)
            .select("id")
            .limit(1)
            .executeTakeFirst();

        return row !== undefined;
    }

    private getPlatformRouteKey(relation: SyncedPlatformRoute): string {
        return `${relation.platformId}::${relation.routeId}`;
    }

    private getGtfsRouteStopKey(routeStop: SyncedGtfsRouteStop): string {
        return [
            routeStop.feedId,
            routeStop.routeId,
            routeStop.directionId,
            routeStop.platformId,
            routeStop.stopSequence,
        ].join("::");
    }

    private getGtfsRouteShapeKey(
        routeShape: Pick<
            SyncedGtfsRouteShape,
            "feedId" | "routeId" | "directionId" | "shapeId"
        >,
    ): string {
        return [
            routeShape.feedId,
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

            const hasMoreBatches = index + batchSize < items.length;

            if (hasMoreBatches && this.batchDelayMs > 0) {
                await this.sleep(this.batchDelayMs);
            }
        }
    }

    private async sleep(durationMs: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, durationMs));
    }
}
