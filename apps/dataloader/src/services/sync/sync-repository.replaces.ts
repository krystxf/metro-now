import {
    type DatabaseTransaction,
    type NewGtfsCalendar,
    type NewGtfsCalendarDate,
    type NewGtfsFrequency,
    type NewGtfsStopTime,
    type NewGtfsTransfer,
    type NewGtfsTrip,
} from "@metro-now/database";

import type {
    SyncedGtfsCalendar,
    SyncedGtfsCalendarDate,
    SyncedGtfsFrequency,
    SyncedGtfsStopTime,
    SyncedGtfsTransfer,
    SyncedGtfsTrip,
} from "../../types/sync.types";
import {
    type IdTableName,
    hasRows,
    processInBatches,
} from "./sync-repository.utils";

async function replaceAll<T>(
    transaction: DatabaseTransaction,
    tableName: IdTableName,
    items: T[],
    batchSize: number,
    insertBatch: (chunk: T[]) => Promise<void>,
): Promise<boolean> {
    const hadRows = await hasRows(transaction, tableName);

    await transaction.deleteFrom(tableName).execute();

    await processInBatches(items, batchSize, async (chunk) => {
        if (chunk.length > 0) {
            await insertBatch(chunk);
        }
    });

    return hadRows || items.length > 0;
}

export async function replaceGtfsTrips(
    transaction: DatabaseTransaction,
    gtfsTrips: SyncedGtfsTrip[],
    batchSize: number,
): Promise<boolean> {
    return replaceAll(
        transaction,
        "GtfsTrip",
        gtfsTrips,
        batchSize,
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
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction.insertInto("GtfsTrip").values(values).execute();
        },
    );
}

export async function replaceGtfsStopTimes(
    transaction: DatabaseTransaction,
    gtfsStopTimes: SyncedGtfsStopTime[],
    batchSize: number,
): Promise<boolean> {
    return replaceAll(
        transaction,
        "GtfsStopTime",
        gtfsStopTimes,
        batchSize,
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
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction
                .insertInto("GtfsStopTime")
                .values(values)
                .execute();
        },
    );
}

export async function replaceGtfsCalendars(
    transaction: DatabaseTransaction,
    gtfsCalendars: SyncedGtfsCalendar[],
    batchSize: number,
): Promise<boolean> {
    return replaceAll(
        transaction,
        "GtfsCalendar",
        gtfsCalendars,
        batchSize,
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
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction
                .insertInto("GtfsCalendar")
                .values(values)
                .execute();
        },
    );
}

export async function replaceGtfsCalendarDates(
    transaction: DatabaseTransaction,
    gtfsCalendarDates: SyncedGtfsCalendarDate[],
    batchSize: number,
): Promise<boolean> {
    return replaceAll(
        transaction,
        "GtfsCalendarDate",
        gtfsCalendarDates,
        batchSize,
        async (chunk) => {
            const timestamp = new Date();
            const values: NewGtfsCalendarDate[] = chunk.map((calendarDate) => ({
                id: calendarDate.id,
                feedId: calendarDate.feedId,
                serviceId: calendarDate.serviceId,
                date: calendarDate.date,
                exceptionType: calendarDate.exceptionType,
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction
                .insertInto("GtfsCalendarDate")
                .values(values)
                .execute();
        },
    );
}

export async function replaceGtfsTransfers(
    transaction: DatabaseTransaction,
    gtfsTransfers: SyncedGtfsTransfer[],
    batchSize: number,
): Promise<boolean> {
    return replaceAll(
        transaction,
        "GtfsTransfer",
        gtfsTransfers,
        batchSize,
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
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction
                .insertInto("GtfsTransfer")
                .values(values)
                .execute();
        },
    );
}

export async function replaceGtfsFrequencies(
    transaction: DatabaseTransaction,
    gtfsFrequencies: SyncedGtfsFrequency[],
    batchSize: number,
): Promise<boolean> {
    return replaceAll(
        transaction,
        "GtfsFrequency",
        gtfsFrequencies,
        batchSize,
        async (chunk) => {
            const timestamp = new Date();
            const values: NewGtfsFrequency[] = chunk.map((frequency) => ({
                id: frequency.id,
                feedId: frequency.feedId,
                tripId: frequency.tripId,
                startTime: frequency.startTime,
                endTime: frequency.endTime,
                headwaySecs: frequency.headwaySecs,
                exactTimes: frequency.exactTimes,
                createdAt: timestamp,
                updatedAt: timestamp,
            }));

            await transaction
                .insertInto("GtfsFrequency")
                .values(values)
                .execute();
        },
    );
}
