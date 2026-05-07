import {
    type DatabaseTransaction,
    type NewGtfsRouteShape,
    type NewGtfsRouteStop,
    type NewPlatformsOnRoutes,
    sql,
} from "@metro-now/database";

import type {
    SyncedGtfsRouteShape,
    SyncedGtfsRouteStop,
    SyncedPlatformRoute,
} from "../../types/sync.types";
import {
    getGtfsRouteShapeKey,
    getGtfsRouteStopKey,
    getPlatformRouteKey,
    processInBatches,
} from "./sync-repository.utils";

export async function syncPlatformRoutes(
    transaction: DatabaseTransaction,
    platformRoutes: SyncedPlatformRoute[],
    batchSize: number,
): Promise<boolean> {
    const existingRelations = await transaction
        .selectFrom("PlatformsOnRoutes")
        .select(["platformId", "feedId", "routeId"])
        .execute();
    const incomingKeys = new Set(
        platformRoutes.map((relation) => getPlatformRouteKey(relation)),
    );
    const existingKeys = new Set(
        existingRelations.map((relation) => getPlatformRouteKey(relation)),
    );
    const relationsToCreate = platformRoutes.filter(
        (relation) => !existingKeys.has(getPlatformRouteKey(relation)),
    );
    const relationsToDelete = existingRelations.filter(
        (relation) => !incomingKeys.has(getPlatformRouteKey(relation)),
    );

    await processInBatches(relationsToCreate, batchSize, async (chunk) => {
        const timestamp = new Date();
        const values: NewPlatformsOnRoutes[] = chunk.map((relation) => ({
            platformId: relation.platformId,
            feedId: relation.feedId,
            routeId: relation.routeId,
            createdAt: timestamp,
            updatedAt: timestamp,
        }));

        await transaction
            .insertInto("PlatformsOnRoutes")
            .values(values)
            .onConflict((conflict) =>
                conflict
                    .columns(["platformId", "feedId", "routeId"])
                    .doNothing(),
            )
            .execute();
    });

    await processInBatches(relationsToDelete, batchSize, async (chunk) => {
        if (chunk.length === 0) {
            return;
        }

        await transaction
            .deleteFrom("PlatformsOnRoutes")
            .where((eb) =>
                eb.or(
                    chunk.map((relation) =>
                        eb.and([
                            eb("platformId", "=", relation.platformId),
                            eb("feedId", "=", relation.feedId),
                            eb("routeId", "=", relation.routeId),
                        ]),
                    ),
                ),
            )
            .execute();
    });

    return relationsToCreate.length > 0 || relationsToDelete.length > 0;
}

export async function syncGtfsRouteStops(
    transaction: DatabaseTransaction,
    gtfsRouteStops: SyncedGtfsRouteStop[],
    batchSize: number,
): Promise<boolean> {
    const existingRouteStops = await transaction
        .selectFrom("GtfsRouteStop")
        .select(["feedId", "routeId", "directionId", "stopId", "stopSequence"])
        .execute();
    const incomingKeys = new Set(
        gtfsRouteStops.map((routeStop) => getGtfsRouteStopKey(routeStop)),
    );
    const existingKeys = new Set(
        existingRouteStops.map((routeStop) =>
            getGtfsRouteStopKey({
                feedId: routeStop.feedId,
                routeId: routeStop.routeId,
                directionId: routeStop.directionId,
                platformId: routeStop.stopId,
                stopSequence: routeStop.stopSequence,
            }),
        ),
    );
    const routeStopsToCreate = gtfsRouteStops.filter(
        (routeStop) => !existingKeys.has(getGtfsRouteStopKey(routeStop)),
    );
    const routeStopsToDelete = existingRouteStops.filter(
        (routeStop) =>
            !incomingKeys.has(
                getGtfsRouteStopKey({
                    feedId: routeStop.feedId,
                    routeId: routeStop.routeId,
                    directionId: routeStop.directionId,
                    platformId: routeStop.stopId,
                    stopSequence: routeStop.stopSequence,
                }),
            ),
    );

    await processInBatches(routeStopsToCreate, batchSize, async (chunk) => {
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
    });

    await processInBatches(routeStopsToDelete, batchSize, async (chunk) => {
        if (chunk.length === 0) {
            return;
        }

        await transaction
            .deleteFrom("GtfsRouteStop")
            .where((eb) =>
                eb.or(
                    chunk.map((routeStop) =>
                        eb.and([
                            eb("feedId", "=", routeStop.feedId),
                            eb("routeId", "=", routeStop.routeId),
                            eb("directionId", "=", routeStop.directionId),
                            eb("stopId", "=", routeStop.stopId),
                            eb("stopSequence", "=", routeStop.stopSequence),
                        ]),
                    ),
                ),
            )
            .execute();
    });

    return routeStopsToCreate.length > 0 || routeStopsToDelete.length > 0;
}

export async function syncGtfsRouteShapes(
    transaction: DatabaseTransaction,
    gtfsRouteShapes: SyncedGtfsRouteShape[],
    batchSize: number,
): Promise<boolean> {
    const existingRouteShapes = await transaction
        .selectFrom("GtfsRouteShape")
        .select(["feedId", "routeId", "directionId", "shapeId"])
        .execute();
    const incomingKeys = new Set(
        gtfsRouteShapes.map((routeShape) => getGtfsRouteShapeKey(routeShape)),
    );
    const routeShapesToDelete = existingRouteShapes.filter(
        (routeShape) => !incomingKeys.has(getGtfsRouteShapeKey(routeShape)),
    );

    await processInBatches(gtfsRouteShapes, batchSize, async (chunk) => {
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
                    .columns(["feedId", "routeId", "directionId", "shapeId"])
                    .doUpdateSet((eb) => ({
                        tripCount: eb.ref("excluded.tripCount"),
                        isPrimary: eb.ref("excluded.isPrimary"),
                        geoJson: eb.ref("excluded.geoJson"),
                        updatedAt: sql`now()`,
                    })),
            )
            .execute();
    });

    await processInBatches(routeShapesToDelete, batchSize, async (chunk) => {
        if (chunk.length === 0) {
            return;
        }

        await transaction
            .deleteFrom("GtfsRouteShape")
            .where((eb) =>
                eb.or(
                    chunk.map((routeShape) =>
                        eb.and([
                            eb("feedId", "=", routeShape.feedId),
                            eb("routeId", "=", routeShape.routeId),
                            eb("directionId", "=", routeShape.directionId),
                            eb("shapeId", "=", routeShape.shapeId),
                        ]),
                    ),
                ),
            )
            .execute();
    });

    return gtfsRouteShapes.length > 0 || routeShapesToDelete.length > 0;
}
