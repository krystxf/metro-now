import { type DatabaseTransaction, sql } from "@metro-now/database";

import type {
    SyncedGtfsRouteShape,
    SyncedGtfsRouteStop,
    SyncedPlatformRoute,
} from "../../types/sync.types";

export type IdTableName =
    | "GtfsRoute"
    | "GtfsCalendar"
    | "GtfsCalendarDate"
    | "GtfsFrequency"
    | "GtfsStationEntrance"
    | "GtfsStopTime"
    | "GtfsTransfer"
    | "GtfsTrip"
    | "Platform"
    | "Stop";

export async function processInBatches<T>(
    items: T[],
    batchSize: number,
    callback: (chunk: T[]) => Promise<void>,
): Promise<void> {
    for (let index = 0; index < items.length; index += batchSize) {
        await callback(items.slice(index, index + batchSize));
    }
}

export async function selectIds(
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

export async function deleteByIds(
    transaction: DatabaseTransaction,
    tableName: IdTableName,
    ids: string[],
    batchSize: number,
): Promise<void> {
    await processInBatches(ids, batchSize, async (chunk) => {
        if (chunk.length === 0) {
            return;
        }

        await transaction
            .deleteFrom(tableName)
            .where("id", "in", chunk)
            .execute();
    });
}

export async function hasRows(
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

export async function hasTable(
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

export async function excludePlatformIdsReferencedByGtfsStopTimes(
    transaction: DatabaseTransaction,
    platformIds: string[],
    batchSize: number,
): Promise<string[]> {
    if (platformIds.length === 0) {
        return platformIds;
    }

    const gtfsStopTimeTableExists = await hasTable(transaction, "GtfsStopTime");

    if (!gtfsStopTimeTableExists) {
        return platformIds;
    }

    const protectedPlatformIds = new Set<string>();

    await processInBatches(platformIds, batchSize, async (chunk) => {
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
    });

    return platformIds.filter((id) => !protectedPlatformIds.has(id));
}

export function getPlatformRouteKey(relation: SyncedPlatformRoute): string {
    return `${relation.platformId}::${relation.feedId}::${relation.routeId}`;
}

export function getGtfsRouteStopKey(routeStop: SyncedGtfsRouteStop): string {
    return [
        routeStop.feedId,
        routeStop.routeId,
        routeStop.directionId,
        routeStop.platformId,
        routeStop.stopSequence,
    ].join("::");
}

export function getGtfsRouteShapeKey(
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
