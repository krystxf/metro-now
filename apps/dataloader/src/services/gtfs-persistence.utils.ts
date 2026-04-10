import { createHash } from "node:crypto";

import type { GtfsFeedId } from "@metro-now/database";

import type { GtfsSnapshot } from "../types/sync.types";

type IdMapper = (id: string) => string;

type BuildGtfsPersistenceSnapshotParams = {
    feedId: GtfsFeedId;
    trips: Record<string, string>[];
    stopTimes: Record<string, string>[];
    calendars?: Record<string, string>[];
    calendarDates?: Record<string, string>[];
    transfers?: Record<string, string>[];
    mapRouteId?: IdMapper;
    mapStopId?: IdMapper;
    mapTripId?: IdMapper;
    mapServiceId?: IdMapper;
};

const identity = (value: string): string => value;

const toOptionalString = (value: string | undefined): string | null => {
    if (value === undefined) {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
};

const toRequiredString = (
    row: Record<string, string>,
    key: string,
    context: string,
): string => {
    const value = toOptionalString(row[key]);

    if (!value) {
        throw new Error(`Missing GTFS ${key} in ${context}`);
    }

    return value;
};

const toOptionalInteger = (
    value: string | undefined,
    field: string,
    context: string,
): number | null => {
    const normalized = toOptionalString(value);

    if (normalized === null) {
        return null;
    }

    const parsed = Number(normalized);

    if (!Number.isInteger(parsed)) {
        throw new Error(
            `Invalid GTFS integer '${field}' with value '${normalized}' in ${context}`,
        );
    }

    return parsed;
};

const toRequiredInteger = (
    row: Record<string, string>,
    key: string,
    context: string,
): number => {
    const parsed = toOptionalInteger(row[key], key, context);

    if (parsed === null) {
        throw new Error(`Missing GTFS ${key} in ${context}`);
    }

    return parsed;
};

const toRequiredBinaryFlag = (
    row: Record<string, string>,
    key: string,
    context: string,
): boolean => {
    const value = toRequiredString(row, key, context);

    if (value === "1") {
        return true;
    }

    if (value === "0") {
        return false;
    }

    throw new Error(`Invalid GTFS binary flag '${key}' with value '${value}'`);
};

const normalizeRawRow = (
    row: Record<string, string>,
): Record<string, string> => {
    for (const key of Object.keys(row)) {
        if (row[key] === undefined) {
            row[key] = "";
        }
    }

    return row;
};

const toStableHash = (parts: Array<string | number | null>): string => {
    const normalized = parts.map((part) => String(part ?? "")).join("\u001f");

    return createHash("sha1").update(normalized).digest("hex");
};

export const buildGtfsPersistenceSnapshot = ({
    feedId,
    trips,
    stopTimes,
    calendars = [],
    calendarDates = [],
    transfers = [],
    mapRouteId = identity,
    mapStopId = identity,
    mapTripId = identity,
    mapServiceId = identity,
}: BuildGtfsPersistenceSnapshotParams): Pick<
    GtfsSnapshot,
    | "gtfsTrips"
    | "gtfsStopTimes"
    | "gtfsCalendars"
    | "gtfsCalendarDates"
    | "gtfsTransfers"
> => {
    const gtfsTrips = trips.map((row) => {
        const context = `trip row '${feedId}'`;
        const rawTripId = toRequiredString(row, "trip_id", context);
        const rawRouteId = toRequiredString(row, "route_id", context);
        const rawServiceId = toOptionalString(row.service_id);
        const tripId = mapTripId(rawTripId);

        return {
            id: `${feedId}::${tripId}`,
            feedId,
            tripId,
            routeId: mapRouteId(rawRouteId),
            serviceId: rawServiceId ? mapServiceId(rawServiceId) : null,
            directionId: toOptionalString(row.direction_id),
            shapeId: toOptionalString(row.shape_id),
            tripHeadsign: toOptionalString(row.trip_headsign),
            blockId: toOptionalString(row.block_id),
            wheelchairAccessible: toOptionalString(row.wheelchair_accessible),
            bikesAllowed: toOptionalString(row.bikes_allowed),
            rawData: normalizeRawRow(row),
        };
    });

    const gtfsStopTimes = stopTimes.map((row) => {
        const context = `stop_times row '${feedId}'`;
        const rawTripId = toRequiredString(row, "trip_id", context);
        const rawStopId = toRequiredString(row, "stop_id", context);
        const tripId = mapTripId(rawTripId);
        const stopId = mapStopId(rawStopId);
        const stopSequence = toRequiredInteger(row, "stop_sequence", context);

        return {
            id: `${feedId}::${tripId}::${stopSequence}::${stopId}`,
            feedId,
            tripId,
            stopId,
            platformId: stopId,
            stopSequence,
            arrivalTime: toOptionalString(row.arrival_time),
            departureTime: toOptionalString(row.departure_time),
            pickupType: toOptionalString(row.pickup_type),
            dropOffType: toOptionalString(row.drop_off_type),
            timepoint: toOptionalString(row.timepoint),
            rawData: normalizeRawRow(row),
        };
    });

    const gtfsCalendars = calendars.map((row) => {
        const context = `calendar row '${feedId}'`;
        const rawServiceId = toRequiredString(row, "service_id", context);
        const serviceId = mapServiceId(rawServiceId);

        return {
            id: `${feedId}::${serviceId}`,
            feedId,
            serviceId,
            monday: toRequiredBinaryFlag(row, "monday", context),
            tuesday: toRequiredBinaryFlag(row, "tuesday", context),
            wednesday: toRequiredBinaryFlag(row, "wednesday", context),
            thursday: toRequiredBinaryFlag(row, "thursday", context),
            friday: toRequiredBinaryFlag(row, "friday", context),
            saturday: toRequiredBinaryFlag(row, "saturday", context),
            sunday: toRequiredBinaryFlag(row, "sunday", context),
            startDate: toOptionalString(row.start_date),
            endDate: toOptionalString(row.end_date),
            rawData: normalizeRawRow(row),
        };
    });

    const gtfsCalendarDates = calendarDates.map((row) => {
        const context = `calendar_dates row '${feedId}'`;
        const rawServiceId = toRequiredString(row, "service_id", context);
        const serviceId = mapServiceId(rawServiceId);
        const date = toRequiredString(row, "date", context);
        const exceptionType = toRequiredInteger(row, "exception_type", context);

        return {
            id: `${feedId}::${serviceId}::${date}::${exceptionType}`,
            feedId,
            serviceId,
            date,
            exceptionType,
            rawData: normalizeRawRow(row),
        };
    });

    const gtfsTransfers = transfers.map((row) => {
        const context = `transfers row '${feedId}'`;
        const fromStopIdRaw = toOptionalString(row.from_stop_id);
        const toStopIdRaw = toOptionalString(row.to_stop_id);
        const fromRouteIdRaw = toOptionalString(row.from_route_id);
        const toRouteIdRaw = toOptionalString(row.to_route_id);
        const fromTripIdRaw = toOptionalString(row.from_trip_id);
        const toTripIdRaw = toOptionalString(row.to_trip_id);
        const transferType = toOptionalInteger(
            row.transfer_type,
            "transfer_type",
            context,
        );
        const minTransferTime = toOptionalInteger(
            row.min_transfer_time,
            "min_transfer_time",
            context,
        );
        const fromStopId = fromStopIdRaw ? mapStopId(fromStopIdRaw) : null;
        const toStopId = toStopIdRaw ? mapStopId(toStopIdRaw) : null;
        const fromRouteId = fromRouteIdRaw ? mapRouteId(fromRouteIdRaw) : null;
        const toRouteId = toRouteIdRaw ? mapRouteId(toRouteIdRaw) : null;
        const fromTripId = fromTripIdRaw ? mapTripId(fromTripIdRaw) : null;
        const toTripId = toTripIdRaw ? mapTripId(toTripIdRaw) : null;

        return {
            id: `${feedId}::${toStableHash([
                fromStopId,
                toStopId,
                fromRouteId,
                toRouteId,
                fromTripId,
                toTripId,
                transferType,
                minTransferTime,
            ])}`,
            feedId,
            fromStopId,
            toStopId,
            fromRouteId,
            toRouteId,
            fromTripId,
            toTripId,
            transferType,
            minTransferTime,
            rawData: normalizeRawRow(row),
        };
    });

    return {
        gtfsTrips,
        gtfsStopTimes,
        gtfsCalendars,
        gtfsCalendarDates,
        gtfsTransfers,
    };
};
