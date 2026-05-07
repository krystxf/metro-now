import { z } from "zod";

import type { GtfsFeedId } from "@metro-now/database";

import { classifyImportedRoute } from "../imports/route-classification.utils";

export const gtfsRouteRecordSchema = z.object({
    route_id: z.string().min(1),
    route_short_name: z.string().min(1),
    route_long_name: z.string().optional(),
    route_type: z.string().min(1),
    route_color: z.string().optional(),
    is_night: z.string().optional(),
    route_url: z.string().optional(),
});

export const gtfsRouteStopRecordSchema = z.object({
    route_id: z.string().min(1),
    direction_id: z.string().min(1),
    stop_id: z.string().min(1),
    stop_sequence: z.string().min(1),
});

export const gtfsStopRecordSchema = z.object({
    stop_id: z.string().min(1),
    stop_name: z.string(),
    stop_lat: z.string().min(1),
    stop_lon: z.string().min(1),
    location_type: z.string().optional(),
    parent_station: z.string().optional(),
});

export const gtfsTripRecordSchema = z.object({
    route_id: z.string().min(1),
    direction_id: z.string().optional(),
    shape_id: z.string().optional(),
});

export const gtfsShapePointRecordSchema = z.object({
    shape_id: z.string().min(1),
    shape_pt_lat: z.string().min(1),
    shape_pt_lon: z.string().min(1),
    shape_pt_sequence: z.string().min(1),
});

export type ParsedGtfsTripRecord = {
    routeId: string;
    directionId: string;
    shapeId: string | null;
};

export type ParsedGtfsShapePointRecord = {
    shapeId: string;
    latitude: number;
    longitude: number;
    sequence: number;
};

export type ParsedGtfsStopRecord = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    locationType: string;
    parentStationId: string | null;
};

export const UNKNOWN_DIRECTION_ID = "unknown";
export const GTFS_LOCATION_TYPE_STOP = "0";
export const GTFS_LOCATION_TYPE_ENTRANCE = "2";

export const toOptionalString = (value?: string): string | null => {
    if (value === undefined) {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
};

export const normalizeGtfsStopId = (stopId: string): string =>
    stopId.split("_")[0];

export const toDirectionId = (value?: string): string =>
    toOptionalString(value) ?? UNKNOWN_DIRECTION_ID;

export const parseNightFlag = (value?: string): boolean | null => {
    if (value === undefined || value.trim() === "") {
        return null;
    }

    if (value === "1") {
        return true;
    }

    if (value === "0") {
        return false;
    }

    throw new Error(`Unexpected GTFS is_night flag: ${value}`);
};

export const parseGtfsRouteRecord = (
    route: Record<string, string>,
    feedId: GtfsFeedId,
) => {
    const parsed = gtfsRouteRecordSchema.safeParse(route);

    if (!parsed.success) {
        throw new Error(`Invalid GTFS route record: ${parsed.error.message}`);
    }

    const { vehicleType } = classifyImportedRoute({
        feedId,
        routeShortName: parsed.data.route_short_name,
        routeType: parsed.data.route_type,
    });

    return {
        id: parsed.data.route_id,
        feedId,
        shortName: parsed.data.route_short_name,
        longName: toOptionalString(parsed.data.route_long_name),
        type: parsed.data.route_type,
        vehicleType,
        color: toOptionalString(parsed.data.route_color),
        isNight: parseNightFlag(parsed.data.is_night),
        url: toOptionalString(parsed.data.route_url),
    };
};

export const parseGtfsRouteStopRecord = (
    routeStop: Record<string, string>,
    feedId: GtfsFeedId,
) => {
    const parsed = gtfsRouteStopRecordSchema.safeParse(routeStop);

    if (!parsed.success) {
        throw new Error(
            `Invalid GTFS route stop record: ${parsed.error.message}`,
        );
    }

    const stopSequence = Number(parsed.data.stop_sequence);

    if (!Number.isInteger(stopSequence)) {
        throw new Error(
            `Invalid GTFS stop sequence: ${parsed.data.stop_sequence}`,
        );
    }

    return {
        feedId,
        routeId: parsed.data.route_id,
        directionId: parsed.data.direction_id,
        platformId: normalizeGtfsStopId(parsed.data.stop_id),
        stopSequence,
    };
};

export const parseGtfsStopRecord = (
    stop: Record<string, string>,
): ParsedGtfsStopRecord => {
    const parsed = gtfsStopRecordSchema.safeParse(stop);

    if (!parsed.success) {
        throw new Error(`Invalid GTFS stop record: ${parsed.error.message}`);
    }

    const latitude = Number(parsed.data.stop_lat);
    const longitude = Number(parsed.data.stop_lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error(
            `Invalid GTFS stop coordinates: ${parsed.data.stop_lat}, ${parsed.data.stop_lon}`,
        );
    }

    return {
        id: normalizeGtfsStopId(parsed.data.stop_id),
        name: parsed.data.stop_name.trim(),
        latitude,
        longitude,
        locationType:
            toOptionalString(parsed.data.location_type) ??
            GTFS_LOCATION_TYPE_STOP,
        parentStationId: parsed.data.parent_station
            ? normalizeGtfsStopId(parsed.data.parent_station)
            : null,
    };
};

export const parseGtfsTripRecord = (
    trip: Record<string, string>,
): ParsedGtfsTripRecord => {
    const parsed = gtfsTripRecordSchema.safeParse(trip);

    if (!parsed.success) {
        throw new Error(`Invalid GTFS trip record: ${parsed.error.message}`);
    }

    return {
        routeId: parsed.data.route_id,
        directionId: toDirectionId(parsed.data.direction_id),
        shapeId: toOptionalString(parsed.data.shape_id),
    };
};

export const parseGtfsShapePointRecord = (
    shapePoint: Record<string, string>,
): ParsedGtfsShapePointRecord => {
    const parsed = gtfsShapePointRecordSchema.safeParse(shapePoint);

    if (!parsed.success) {
        throw new Error(
            `Invalid GTFS shape point record: ${parsed.error.message}`,
        );
    }

    const latitude = Number(parsed.data.shape_pt_lat);
    const longitude = Number(parsed.data.shape_pt_lon);
    const sequence = Number(parsed.data.shape_pt_sequence);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error(
            `Invalid GTFS shape point coordinates: ${parsed.data.shape_pt_lat}, ${parsed.data.shape_pt_lon}`,
        );
    }

    if (!Number.isInteger(sequence)) {
        throw new Error(
            `Invalid GTFS shape point sequence: ${parsed.data.shape_pt_sequence}`,
        );
    }

    return {
        shapeId: parsed.data.shape_id,
        latitude,
        longitude,
        sequence,
    };
};
