import {
    type DatabaseClient,
    type DatabaseTransaction,
    sql,
} from "@metro-now/database";

import type {
    SyncPersistenceResult,
    SyncSnapshot,
} from "../../types/sync.types";
import { getSyncCounts } from "../../types/sync.types";
import {
    deleteStaleGtfsRoutes,
    deleteStaleGtfsStationEntrances,
    deleteStalePlatforms,
    deleteStaleStops,
    recomputePlatformDirections,
} from "./sync-repository.cleanup";
import {
    replaceGtfsCalendarDates,
    replaceGtfsCalendars,
    replaceGtfsFrequencies,
    replaceGtfsStopTimes,
    replaceGtfsTransfers,
    replaceGtfsTrips,
} from "./sync-repository.replaces";
import {
    syncGtfsRouteShapes,
    syncGtfsRouteStops,
    syncPlatformRoutes,
} from "./sync-repository.sync";
import {
    upsertGtfsRoutes,
    upsertGtfsStationEntrances,
    upsertPlatforms,
    upsertStops,
} from "./sync-repository.upserts";

const LOCK_KEY = BigInt(4_241_001);
const ENTITY_BATCH_SIZE = 100;
const RELATION_BATCH_SIZE = 500;

type SyncRepositoryOptions = {
    entityBatchSize?: number;
    relationBatchSize?: number;
};

export class SyncRepository {
    private readonly entityBatchSize: number;
    private readonly relationBatchSize: number;

    constructor(
        private readonly db: DatabaseClient,
        options: SyncRepositoryOptions = {},
    ) {
        this.entityBatchSize = options.entityBatchSize ?? ENTITY_BATCH_SIZE;
        this.relationBatchSize =
            options.relationBatchSize ?? RELATION_BATCH_SIZE;
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

            const changedEntities = await this.persistSnapshot(
                transaction,
                snapshot,
            );

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

    private async tryAcquireTransactionLock(
        transaction: DatabaseTransaction,
    ): Promise<boolean> {
        const result = await sql<{ acquired: boolean }>`
            SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS acquired
        `.execute(transaction);

        return result.rows[0]?.acquired ?? false;
    }

    private async persistSnapshot(
        transaction: DatabaseTransaction,
        snapshot: SyncSnapshot,
    ): Promise<string[]> {
        const changed = new Set<string>();
        const eb = this.entityBatchSize;
        const rb = this.relationBatchSize;

        await upsertStops(transaction, snapshot.stops, eb);
        await upsertPlatforms(transaction, snapshot.platforms, eb);
        await upsertGtfsRoutes(transaction, snapshot.gtfsRoutes, eb);
        await upsertGtfsStationEntrances(
            transaction,
            snapshot.gtfsStationEntrances,
            eb,
        );

        if (await replaceGtfsTrips(transaction, snapshot.gtfsTrips, rb)) {
            changed.add("gtfsTrips");
        }
        if (
            await replaceGtfsStopTimes(transaction, snapshot.gtfsStopTimes, rb)
        ) {
            changed.add("gtfsStopTimes");
        }
        if (
            await replaceGtfsCalendars(transaction, snapshot.gtfsCalendars, rb)
        ) {
            changed.add("gtfsCalendars");
        }
        if (
            await replaceGtfsCalendarDates(
                transaction,
                snapshot.gtfsCalendarDates,
                rb,
            )
        ) {
            changed.add("gtfsCalendarDates");
        }
        if (
            await replaceGtfsTransfers(transaction, snapshot.gtfsTransfers, rb)
        ) {
            changed.add("gtfsTransfers");
        }
        if (
            await replaceGtfsFrequencies(
                transaction,
                snapshot.gtfsFrequencies,
                rb,
            )
        ) {
            changed.add("gtfsFrequencies");
        }

        if (
            await syncPlatformRoutes(transaction, snapshot.platformRoutes, rb)
        ) {
            changed.add("platformRoutes");
        }
        if (
            await syncGtfsRouteStops(transaction, snapshot.gtfsRouteStops, rb)
        ) {
            changed.add("gtfsRouteStops");
        }
        if (
            await syncGtfsRouteShapes(transaction, snapshot.gtfsRouteShapes, rb)
        ) {
            changed.add("gtfsRouteShapes");
        }

        if (
            await deleteStaleGtfsStationEntrances(
                transaction,
                snapshot.gtfsStationEntrances,
                rb,
            )
        ) {
            changed.add("gtfsStationEntrances");
        }
        if (await deleteStalePlatforms(transaction, snapshot.platforms, rb)) {
            changed.add("platforms");
        }
        if (await recomputePlatformDirections(transaction)) {
            changed.add("platforms");
        }
        if (await deleteStaleStops(transaction, snapshot.stops, rb)) {
            changed.add("stops");
        }
        if (await deleteStaleGtfsRoutes(transaction, snapshot.gtfsRoutes, rb)) {
            changed.add("gtfsRoutes");
        }

        // Upserts with ON CONFLICT DO UPDATE always touch rows, so we detect
        // changes by checking if any row's updatedAt was set to the current
        // transaction time (i.e., it was actually inserted or updated).
        // For simplicity, we check if any rows exist at all — the upsert data
        // came from the live PID API, so any non-empty upsert is a potential change.
        if (snapshot.stops.length > 0) changed.add("stops");
        if (snapshot.platforms.length > 0) changed.add("platforms");
        if (snapshot.gtfsRoutes.length > 0) changed.add("gtfsRoutes");
        if (snapshot.gtfsStationEntrances.length > 0)
            changed.add("gtfsStationEntrances");
        if (snapshot.gtfsTrips.length > 0) changed.add("gtfsTrips");
        if (snapshot.gtfsStopTimes.length > 0) changed.add("gtfsStopTimes");
        if (snapshot.gtfsCalendars.length > 0) changed.add("gtfsCalendars");
        if (snapshot.gtfsCalendarDates.length > 0)
            changed.add("gtfsCalendarDates");
        if (snapshot.gtfsTransfers.length > 0) changed.add("gtfsTransfers");
        if (snapshot.gtfsFrequencies.length > 0) changed.add("gtfsFrequencies");

        return [...changed];
    }
}
