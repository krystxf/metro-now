import {
    type DatabaseTransaction,
    type NewGtfsRoute,
    type NewGtfsStationEntrance,
    type NewPlatform,
    type NewStop,
    sql,
} from "@metro-now/database";

import type {
    SyncedGtfsRoute,
    SyncedGtfsStationEntrance,
    SyncedPlatform,
    SyncedStop,
} from "../../types/sync.types";
import { processInBatches } from "./sync-repository.utils";

export async function upsertStops(
    transaction: DatabaseTransaction,
    stops: SyncedStop[],
    batchSize: number,
): Promise<void> {
    await processInBatches(stops, batchSize, async (chunk) => {
        const timestamp = new Date();
        const values: NewStop[] = chunk.map((stop) => ({
            id: stop.id,
            feed: stop.feed,
            name: stop.name,
            avgLatitude: stop.avgLatitude,
            avgLongitude: stop.avgLongitude,
            country: stop.country ?? null,
            createdAt: timestamp,
            updatedAt: timestamp,
        }));

        await transaction
            .insertInto("Stop")
            .values(values)
            .onConflict((conflict) =>
                conflict.column("id").doUpdateSet((eb) => ({
                    feed: eb.ref("excluded.feed"),
                    name: eb.ref("excluded.name"),
                    avgLatitude: eb.ref("excluded.avgLatitude"),
                    avgLongitude: eb.ref("excluded.avgLongitude"),
                    country: eb.ref("excluded.country"),
                    updatedAt: sql`now()`,
                })),
            )
            .execute();
    });
}

export async function upsertPlatforms(
    transaction: DatabaseTransaction,
    platforms: SyncedPlatform[],
    batchSize: number,
): Promise<void> {
    await processInBatches(platforms, batchSize, async (chunk) => {
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
                conflict.column("id").doUpdateSet((eb) => ({
                    name: eb.ref("excluded.name"),
                    code: eb.ref("excluded.code"),
                    isMetro: eb.ref("excluded.isMetro"),
                    latitude: eb.ref("excluded.latitude"),
                    longitude: eb.ref("excluded.longitude"),
                    stopId: eb.ref("excluded.stopId"),
                    updatedAt: sql`now()`,
                })),
            )
            .execute();
    });
}

export async function upsertGtfsRoutes(
    transaction: DatabaseTransaction,
    gtfsRoutes: SyncedGtfsRoute[],
    batchSize: number,
): Promise<void> {
    await processInBatches(gtfsRoutes, batchSize, async (chunk) => {
        const timestamp = new Date();
        const values: NewGtfsRoute[] = chunk.map((gtfsRoute) => ({
            id: gtfsRoute.id,
            feedId: gtfsRoute.feedId,
            shortName: gtfsRoute.shortName,
            longName: gtfsRoute.longName,
            type: gtfsRoute.type,
            vehicleType: gtfsRoute.vehicleType,
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
                conflict.columns(["feedId", "id"]).doUpdateSet((eb) => ({
                    shortName: eb.ref("excluded.shortName"),
                    longName: eb.ref("excluded.longName"),
                    type: eb.ref("excluded.type"),
                    vehicleType: eb.ref("excluded.vehicleType"),
                    color: eb.ref("excluded.color"),
                    isNight: eb.ref("excluded.isNight"),
                    url: eb.ref("excluded.url"),
                    updatedAt: sql`now()`,
                })),
            )
            .execute();
    });
}

export async function upsertGtfsStationEntrances(
    transaction: DatabaseTransaction,
    gtfsStationEntrances: SyncedGtfsStationEntrance[],
    batchSize: number,
): Promise<void> {
    await processInBatches(gtfsStationEntrances, batchSize, async (chunk) => {
        const timestamp = new Date();
        const values: NewGtfsStationEntrance[] = chunk.map((entrance) => ({
            id: entrance.id,
            feedId: entrance.feedId,
            stopId: entrance.stopId,
            parentStationId: entrance.parentStationId,
            name: entrance.name,
            latitude: entrance.latitude,
            longitude: entrance.longitude,
            createdAt: timestamp,
            updatedAt: timestamp,
        }));

        await transaction
            .insertInto("GtfsStationEntrance")
            .values(values)
            .onConflict((conflict) =>
                conflict.columns(["feedId", "id"]).doUpdateSet((eb) => ({
                    stopId: eb.ref("excluded.stopId"),
                    parentStationId: eb.ref("excluded.parentStationId"),
                    name: eb.ref("excluded.name"),
                    latitude: eb.ref("excluded.latitude"),
                    longitude: eb.ref("excluded.longitude"),
                    updatedAt: sql`now()`,
                })),
            )
            .execute();
    });
}
