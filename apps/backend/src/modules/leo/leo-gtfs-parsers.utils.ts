import { parseString } from "@fast-csv/parse";
import { z } from "zod";

import { toLeoPlatformId, toLeoStopId } from "src/modules/leo/leo-id.utils";
import type {
    LeoPlatform,
    LeoStop,
    LeoStopEntrance,
} from "src/modules/leo/leo.types";

export const EMPTY_LOCATION_TYPE = "0";
export const LOCATION_TYPE_PLATFORM = new Set(["0", "4"]);
export const LOCATION_TYPE_ENTRANCE = "2";

export const agencyRowSchema = z.object({
    agency_id: z.string().min(1),
    agency_name: z.string().min(1),
});

export const routeRowSchema = z.object({
    route_id: z.string().min(1),
    agency_id: z.string().min(1),
    route_short_name: z.string().min(1),
    route_long_name: z.string().optional(),
    route_type: z.string().min(1),
    route_url: z.string().optional(),
    route_color: z.string().optional(),
});

export const tripRowSchema = z.object({
    trip_id: z.string().min(1),
    route_id: z.string().min(1),
    trip_headsign: z.string().optional(),
    trip_short_name: z.string().optional(),
    direction_id: z.string().optional(),
});

export const stopRowSchema = z.object({
    stop_id: z.string().min(1),
    stop_name: z.string(),
    stop_lat: z.string().min(1),
    stop_lon: z.string().min(1),
    location_type: z.string().optional(),
    parent_station: z.string().optional(),
    platform_code: z.string().optional(),
});

export const stopTimeRowSchema = z.object({
    trip_id: z.string().min(1),
    stop_id: z.string().min(1),
    stop_sequence: z.string().min(1),
});

export type AgencyRow = z.infer<typeof agencyRowSchema>;
export type RouteRow = z.infer<typeof routeRowSchema>;
export type TripRow = z.infer<typeof tripRowSchema>;
export type StopRow = z.infer<typeof stopRowSchema>;
export type StopTimeRow = z.infer<typeof stopTimeRowSchema>;

export type ParsedStop = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    locationType: string;
    parentStationId: string | null;
    platformCode: string | null;
};

export type ParsedRoute = {
    id: string;
    agencyId: string;
    shortName: string;
    longName: string | null;
    type: string;
    url: string | null;
    color: string | null;
};

export type ParsedTrip = {
    id: string;
    routeId: string;
    headsign: string | null;
    shortName: string | null;
    directionId: string;
};

export type ParsedStopTime = {
    tripId: string;
    stopId: string;
    stopSequence: number;
};

export type DominantPattern = {
    directionId: string;
    platformIds: string[];
    tripCount: number;
};

export const parseCsvString = async <Row>(
    csvString: string,
): Promise<Row[]> => {
    return await new Promise<Row[]>((resolve, reject) => {
        const rows: Row[] = [];

        parseString(csvString, { headers: true, trim: true })
            .on("error", (error) => reject(error))
            .on("data", (row) => rows.push(row))
            .on("end", () => resolve(rows));
    });
};

export const toOptionalString = (value?: string): string | null => {
    if (value === undefined) {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
};

export const normalizeStopName = (name: string): string =>
    name
        .normalize("NFD")
        .replace(/\p{Diacritic}+/gu, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

export const parseStop = (row: StopRow): ParsedStop => {
    const parsed = stopRowSchema.parse(row);
    const latitude = Number(parsed.stop_lat);
    const longitude = Number(parsed.stop_lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error(
            `Invalid Leo GTFS stop coordinates for '${parsed.stop_id}'`,
        );
    }

    return {
        id: parsed.stop_id,
        name: parsed.stop_name.trim(),
        latitude,
        longitude,
        locationType:
            toOptionalString(parsed.location_type) ?? EMPTY_LOCATION_TYPE,
        parentStationId: toOptionalString(parsed.parent_station),
        platformCode: toOptionalString(parsed.platform_code),
    };
};

export const parseRoute = (row: RouteRow): ParsedRoute => {
    const parsed = routeRowSchema.parse(row);

    return {
        id: parsed.route_id,
        agencyId: parsed.agency_id,
        shortName: parsed.route_short_name.trim(),
        longName: toOptionalString(parsed.route_long_name),
        type: parsed.route_type,
        url: toOptionalString(parsed.route_url),
        color: toOptionalString(parsed.route_color),
    };
};

export const parseTrip = (row: TripRow): ParsedTrip => {
    const parsed = tripRowSchema.parse(row);

    return {
        id: parsed.trip_id,
        routeId: parsed.route_id,
        headsign: toOptionalString(parsed.trip_headsign),
        shortName: toOptionalString(parsed.trip_short_name),
        directionId: toOptionalString(parsed.direction_id) ?? "0",
    };
};

export const parseStopTime = (row: StopTimeRow): ParsedStopTime => {
    const parsed = stopTimeRowSchema.parse(row);
    const stopSequence = Number(parsed.stop_sequence);

    if (!Number.isInteger(stopSequence)) {
        throw new Error(
            `Invalid Leo GTFS stop sequence '${parsed.stop_sequence}'`,
        );
    }

    return {
        tripId: parsed.trip_id,
        stopId: parsed.stop_id,
        stopSequence,
    };
};

const sortPlatformIds = (
    left: Pick<LeoPlatform, "id">,
    right: Pick<LeoPlatform, "id">,
) => left.id.localeCompare(right.id);

export const buildLogicalStops = ({
    referencedStopIds,
    stopsById,
}: {
    referencedStopIds: Set<string>;
    stopsById: Map<string, ParsedStop>;
}): {
    logicalStops: LeoStop[];
    platformById: Map<string, LeoPlatform>;
    publicStopIdByPlatformId: Map<string, string>;
} => {
    const childStopsByParentId = new Map<string, ParsedStop[]>();

    for (const stop of stopsById.values()) {
        if (!stop.parentStationId) {
            continue;
        }

        const children = childStopsByParentId.get(stop.parentStationId) ?? [];

        children.push(stop);
        childStopsByParentId.set(stop.parentStationId, children);
    }

    const logicalStopIds = new Set<string>();

    for (const stopId of referencedStopIds) {
        const stop = stopsById.get(stopId);

        if (!stop) {
            continue;
        }

        logicalStopIds.add(stop.parentStationId ?? stop.id);
    }

    const logicalStops: LeoStop[] = [];
    const platformById = new Map<string, LeoPlatform>();
    const publicStopIdByPlatformId = new Map<string, string>();

    for (const logicalStopSourceId of [...logicalStopIds].sort((a, b) =>
        a.localeCompare(b),
    )) {
        const sourceStop = stopsById.get(logicalStopSourceId);

        if (!sourceStop) {
            continue;
        }

        const children = childStopsByParentId.get(logicalStopSourceId) ?? [];
        const platformStops = children.filter((stop) =>
            LOCATION_TYPE_PLATFORM.has(stop.locationType),
        );
        const entranceStops = children.filter(
            (stop) => stop.locationType === LOCATION_TYPE_ENTRANCE,
        );
        const logicalStopId = toLeoStopId(logicalStopSourceId);
        const platformSeeds =
            platformStops.length > 0
                ? platformStops
                : LOCATION_TYPE_PLATFORM.has(sourceStop.locationType)
                  ? [sourceStop]
                  : [];

        const platforms = platformSeeds
            .map<LeoPlatform>((platformStop) => ({
                id: toLeoPlatformId(platformStop.id),
                latitude: platformStop.latitude,
                longitude: platformStop.longitude,
                name: platformStop.name,
                isMetro: false,
                code: platformStop.platformCode,
                stopId: logicalStopId,
                routes: [],
            }))
            .sort(sortPlatformIds);
        const entrances = entranceStops
            .map<LeoStopEntrance>((entranceStop) => ({
                id: entranceStop.id,
                name: entranceStop.name,
                latitude: entranceStop.latitude,
                longitude: entranceStop.longitude,
            }))
            .sort((left, right) => left.id.localeCompare(right.id));
        const coordinatePoints =
            platforms.length > 0
                ? platforms.map((platform) => ({
                      latitude: platform.latitude,
                      longitude: platform.longitude,
                  }))
                : entrances.length > 0
                  ? entrances
                  : [
                        {
                            latitude: sourceStop.latitude,
                            longitude: sourceStop.longitude,
                        },
                    ];
        const avgLatitude =
            coordinatePoints.reduce((sum, point) => sum + point.latitude, 0) /
            coordinatePoints.length;
        const avgLongitude =
            coordinatePoints.reduce((sum, point) => sum + point.longitude, 0) /
            coordinatePoints.length;

        for (const platform of platforms) {
            platformById.set(platform.id, platform);
            publicStopIdByPlatformId.set(platform.id, logicalStopId);
        }

        logicalStops.push({
            id: logicalStopId,
            gtfsStopId: logicalStopSourceId,
            name: sourceStop.name,
            avgLatitude,
            avgLongitude,
            normalizedName: normalizeStopName(sourceStop.name),
            platforms,
            entrances,
        });
    }

    return {
        logicalStops,
        platformById,
        publicStopIdByPlatformId,
    };
};

export const chooseDominantPattern = (
    patterns: Map<string, DominantPattern>,
): DominantPattern | null => {
    const values = [...patterns.values()];

    if (values.length === 0) {
        return null;
    }

    values.sort((left, right) => {
        return (
            right.tripCount - left.tripCount ||
            right.platformIds.length - left.platformIds.length ||
            left.platformIds
                .join(">")
                .localeCompare(right.platformIds.join(">"))
        );
    });

    return values.at(0) ?? null;
};
