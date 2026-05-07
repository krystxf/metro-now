import { type DatabaseTransaction, sql } from "@metro-now/database";

import type {
    SyncedGtfsRoute,
    SyncedGtfsStationEntrance,
    SyncedPlatform,
    SyncedStop,
} from "../../types/sync.types";
import { logger } from "../../utils/logger";
import {
    deleteByIds,
    excludePlatformIdsReferencedByGtfsStopTimes,
    processInBatches,
    selectIds,
} from "./sync-repository.utils";

export async function deleteStalePlatforms(
    transaction: DatabaseTransaction,
    platforms: SyncedPlatform[],
    batchSize: number,
): Promise<boolean> {
    const incomingIds = new Set(platforms.map((platform) => platform.id));
    const staleIds = (await selectIds(transaction, "Platform")).filter(
        (id) => !incomingIds.has(id),
    );
    const deletableIds = await excludePlatformIdsReferencedByGtfsStopTimes(
        transaction,
        staleIds,
        batchSize,
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

    await deleteByIds(transaction, "Platform", deletableIds, batchSize);

    return deletableIds.length > 0;
}

export async function deleteStaleStops(
    transaction: DatabaseTransaction,
    stops: SyncedStop[],
    batchSize: number,
): Promise<boolean> {
    const incomingIds = new Set(stops.map((stop) => stop.id));
    const staleIds = (await selectIds(transaction, "Stop")).filter(
        (id) => !incomingIds.has(id),
    );

    await deleteByIds(transaction, "Stop", staleIds, batchSize);

    return staleIds.length > 0;
}

export async function deleteStaleGtfsRoutes(
    transaction: DatabaseTransaction,
    gtfsRoutes: SyncedGtfsRoute[],
    batchSize: number,
): Promise<boolean> {
    const incomingKeys = new Set(
        gtfsRoutes.map((route) => `${route.feedId}::${route.id}`),
    );
    const staleRouteKeys = (
        await transaction
            .selectFrom("GtfsRoute")
            .select(["feedId", "id"])
            .execute()
    ).filter((route) => !incomingKeys.has(`${route.feedId}::${route.id}`));

    await processInBatches(staleRouteKeys, batchSize, async (chunk) => {
        if (chunk.length === 0) {
            return;
        }

        await transaction
            .deleteFrom("GtfsRoute")
            .where((eb) =>
                eb.or(
                    chunk.map((route) =>
                        eb.and([
                            eb("feedId", "=", route.feedId),
                            eb("id", "=", route.id),
                        ]),
                    ),
                ),
            )
            .execute();
    });

    return staleRouteKeys.length > 0;
}

export async function deleteStaleGtfsStationEntrances(
    transaction: DatabaseTransaction,
    gtfsStationEntrances: SyncedGtfsStationEntrance[],
    batchSize: number,
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

    await processInBatches(staleEntrances, batchSize, async (chunk) => {
        if (chunk.length === 0) {
            return;
        }

        await transaction
            .deleteFrom("GtfsStationEntrance")
            .where((eb) =>
                eb.or(
                    chunk.map((entrance) =>
                        eb.and([
                            eb("feedId", "=", entrance.feedId),
                            eb("id", "=", entrance.id),
                        ]),
                    ),
                ),
            )
            .execute();
    });

    return staleEntrances.length > 0;
}

export async function recomputePlatformDirections(
    transaction: DatabaseTransaction,
): Promise<boolean> {
    const updatedResult = await sql<{ id: string }>`
        UPDATE "Platform" p
        SET "direction" = bd.next_stop_name,
            "updatedAt" = now()
        FROM (
            SELECT DISTINCT ON (o.platform_id)
                o.platform_id,
                s."name" AS next_stop_name
            FROM (
                SELECT
                    st."platformId" AS platform_id,
                    st."stopId" AS current_platform_id,
                    LEAD(st."stopId") OVER (
                        PARTITION BY st."feedId", st."tripId"
                        ORDER BY st."stopSequence"
                    ) AS next_platform_id
                FROM "GtfsStopTime" st
                WHERE st."platformId" IS NOT NULL
            ) o
            JOIN "Platform" next_p ON next_p."id" = o.next_platform_id
            JOIN "Stop" s ON s."id" = next_p."stopId"
            WHERE o.next_platform_id IS NOT NULL
              AND o.next_platform_id <> o.current_platform_id
            GROUP BY o.platform_id, s."name"
            ORDER BY o.platform_id, COUNT(*) DESC, s."name" ASC
        ) bd
        WHERE p."id" = bd.platform_id
          AND p."direction" IS DISTINCT FROM bd.next_stop_name
        RETURNING p."id"
    `.execute(transaction);

    const clearedResult = await sql<{ id: string }>`
        UPDATE "Platform" p
        SET "direction" = NULL,
            "updatedAt" = now()
        WHERE p."direction" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "GtfsStopTime" st
            WHERE st."platformId" = p."id"
          )
        RETURNING p."id"
    `.execute(transaction);

    return updatedResult.rows.length > 0 || clearedResult.rows.length > 0;
}
