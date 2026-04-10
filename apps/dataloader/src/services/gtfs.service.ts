import { Open as unzipperOpen } from "unzipper";
import { z } from "zod";

import { GtfsFeedId } from "@metro-now/database";

import type { GtfsSnapshot } from "../types/sync.types";
import { buildGtfsPersistenceSnapshot } from "./gtfs-persistence.utils";
import { parseCsvString } from "../utils/csv.utils";
import { fetchWithTimeout } from "../utils/fetch.utils";

const GTFS_ARCHIVE_URL = "https://data.pid.cz/PID_GTFS.zip";

const gtfsRouteRecordSchema = z.object({
    route_id: z.string().min(1),
    route_short_name: z.string().min(1),
    route_long_name: z.string().optional(),
    route_type: z.string().min(1),
    route_color: z.string().optional(),
    is_night: z.string().optional(),
    route_url: z.string().optional(),
});

const gtfsRouteStopRecordSchema = z.object({
    route_id: z.string().min(1),
    direction_id: z.string().min(1),
    stop_id: z.string().min(1),
    stop_sequence: z.string().min(1),
});

const gtfsStopRecordSchema = z.object({
    stop_id: z.string().min(1),
    stop_name: z.string(),
    stop_lat: z.string().min(1),
    stop_lon: z.string().min(1),
    location_type: z.string().optional(),
    parent_station: z.string().optional(),
});

const gtfsTripRecordSchema = z.object({
    route_id: z.string().min(1),
    direction_id: z.string().optional(),
    shape_id: z.string().optional(),
});

const gtfsShapePointRecordSchema = z.object({
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

const UNKNOWN_DIRECTION_ID = "unknown";
const GTFS_LOCATION_TYPE_STOP = "0";
const GTFS_LOCATION_TYPE_ENTRANCE = "2";

const getGtfsRouteShapeKey = (routeShape: {
    routeId: string;
    directionId: string;
    shapeId: string;
}): string =>
    [routeShape.routeId, routeShape.directionId, routeShape.shapeId].join("::");

const getGtfsRouteDirectionKey = (routeShape: {
    routeId: string;
    directionId: string;
}): string => [routeShape.routeId, routeShape.directionId].join("::");

const comparePrimaryRouteShape = (
    left: {
        shapeId: string;
        tripCount: number;
        geoJson: { coordinates: [number, number][] };
    },
    right: {
        shapeId: string;
        tripCount: number;
        geoJson: { coordinates: [number, number][] };
    },
): number => {
    if (left.tripCount !== right.tripCount) {
        return left.tripCount - right.tripCount;
    }

    if (left.geoJson.coordinates.length !== right.geoJson.coordinates.length) {
        return (
            left.geoJson.coordinates.length - right.geoJson.coordinates.length
        );
    }

    return right.shapeId.localeCompare(left.shapeId);
};

const sortShapePoints = (
    shapePoints: ParsedGtfsShapePointRecord[],
): ParsedGtfsShapePointRecord[] =>
    [...shapePoints].sort((left, right) => left.sequence - right.sequence);

export const buildGtfsShapeDatasets = ({
    feedId,
    trips,
    shapePoints,
    routeIdsWithImportedPlatforms,
}: {
    feedId: GtfsFeedId;
    trips: ParsedGtfsTripRecord[];
    shapePoints: ParsedGtfsShapePointRecord[];
    routeIdsWithImportedPlatforms: Set<string>;
}): Pick<GtfsSnapshot, "gtfsRouteShapes"> => {
    const routeShapeTripCountsByKey = new Map<
        string,
        {
            routeId: string;
            directionId: string;
            shapeId: string;
            tripCount: number;
        }
    >();

    for (const trip of trips) {
        if (!trip.shapeId || !routeIdsWithImportedPlatforms.has(trip.routeId)) {
            continue;
        }

        const routeShapeKey = getGtfsRouteShapeKey({
            routeId: trip.routeId,
            directionId: trip.directionId,
            shapeId: trip.shapeId,
        });
        const existingRouteShape = routeShapeTripCountsByKey.get(routeShapeKey);

        if (existingRouteShape) {
            existingRouteShape.tripCount += 1;
            continue;
        }

        routeShapeTripCountsByKey.set(routeShapeKey, {
            routeId: trip.routeId,
            directionId: trip.directionId,
            shapeId: trip.shapeId,
            tripCount: 1,
        });
    }

    const shapePointsByShapeId = new Map<
        string,
        ParsedGtfsShapePointRecord[]
    >();

    for (const shapePoint of shapePoints) {
        const existingShapePoints =
            shapePointsByShapeId.get(shapePoint.shapeId) ?? [];

        existingShapePoints.push(shapePoint);
        shapePointsByShapeId.set(shapePoint.shapeId, existingShapePoints);
    }
    const gtfsRouteShapes = [...routeShapeTripCountsByKey.values()]
        .map((routeShape) => {
            const unsortedShapePoints = shapePointsByShapeId.get(
                routeShape.shapeId,
            );

            if (!unsortedShapePoints || unsortedShapePoints.length === 0) {
                throw new Error(
                    `GTFS trip references missing shape '${routeShape.shapeId}' for route '${routeShape.routeId}' direction '${routeShape.directionId}'`,
                );
            }

            const sortedShapePoints = sortShapePoints(unsortedShapePoints);

            return {
                feedId,
                routeId: routeShape.routeId,
                directionId: routeShape.directionId,
                shapeId: routeShape.shapeId,
                tripCount: routeShape.tripCount,
                isPrimary: false,
                geoJson: {
                    type: "LineString" as const,
                    coordinates: sortedShapePoints.map(
                        (shapePoint): [number, number] => [
                            shapePoint.longitude,
                            shapePoint.latitude,
                        ],
                    ),
                },
            };
        })
        .sort((left, right) => {
            return (
                left.routeId.localeCompare(right.routeId) ||
                left.directionId.localeCompare(right.directionId) ||
                left.shapeId.localeCompare(right.shapeId)
            );
        });
    const primaryRouteShapeByRouteDirection = new Map<
        string,
        (typeof gtfsRouteShapes)[number]
    >();

    for (const routeShape of gtfsRouteShapes) {
        const routeDirectionKey = getGtfsRouteDirectionKey(routeShape);
        const currentPrimaryRouteShape =
            primaryRouteShapeByRouteDirection.get(routeDirectionKey);

        if (
            !currentPrimaryRouteShape ||
            comparePrimaryRouteShape(routeShape, currentPrimaryRouteShape) > 0
        ) {
            primaryRouteShapeByRouteDirection.set(
                routeDirectionKey,
                routeShape,
            );
        }
    }

    return {
        gtfsRouteShapes: gtfsRouteShapes.map((routeShape) => ({
            ...routeShape,
            isPrimary:
                getGtfsRouteShapeKey(
                    primaryRouteShapeByRouteDirection.get(
                        getGtfsRouteDirectionKey(routeShape),
                    ) ?? routeShape,
                ) === getGtfsRouteShapeKey(routeShape),
        })),
    };
};

export const buildGtfsStationEntranceDataset = ({
    feedId,
    stops,
    importedMetroStopIds,
}: {
    feedId: GtfsFeedId;
    stops: ParsedGtfsStopRecord[];
    importedMetroStopIds: Set<string>;
}): Pick<GtfsSnapshot, "gtfsStationEntrances"> => {
    const gtfsStationEntrancesById = new Map<
        string,
        GtfsSnapshot["gtfsStationEntrances"][number]
    >();

    for (const stop of stops) {
        if (stop.locationType !== GTFS_LOCATION_TYPE_ENTRANCE) {
            continue;
        }

        if (!stop.parentStationId) {
            throw new Error(
                `GTFS station entrance '${stop.id}' is missing parent_station`,
            );
        }

        const stopId = getCanonicalStopIdFromParentStationId(
            stop.parentStationId,
        );

        if (!importedMetroStopIds.has(stopId)) {
            continue;
        }

        gtfsStationEntrancesById.set(stop.id, {
            id: stop.id,
            feedId,
            stopId,
            parentStationId: stop.parentStationId,
            name: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
        });
    }

    return {
        gtfsStationEntrances: Array.from(
            gtfsStationEntrancesById.values(),
        ).sort(
            (left, right) =>
                left.stopId.localeCompare(right.stopId) ||
                left.parentStationId.localeCompare(right.parentStationId) ||
                left.id.localeCompare(right.id),
        ),
    };
};

const normalizeGtfsStopId = (stopId: string): string => stopId.split("_")[0];

const getCanonicalStopIdFromParentStationId = (
    parentStationId: string,
): string => {
    const normalizedParentStationId = normalizeGtfsStopId(parentStationId);
    const stopId = normalizedParentStationId.split("S")[0];

    if (!stopId || stopId === normalizedParentStationId) {
        throw new Error(
            `Unexpected GTFS parent_station format '${parentStationId}'`,
        );
    }

    return stopId;
};

export class GtfsService {
    async getGtfsSnapshot({
        platformIds,
        importedMetroStopIds,
    }: {
        platformIds: Set<string>;
        importedMetroStopIds: Set<string>;
    }): Promise<GtfsSnapshot> {
        const response = await fetchWithTimeout(GTFS_ARCHIVE_URL);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch GTFS archive: ${response.status} ${response.statusText}`,
            );
        }

        const directory = await unzipperOpen.buffer(
            Buffer.from(await response.arrayBuffer()),
        );
        const routesEntry = directory.files.find(
            (file) => file.path === "routes.txt",
        );
        const routeStopsEntry = directory.files.find(
            (file) => file.path === "route_stops.txt",
        );
        const stopsEntry = directory.files.find(
            (file) => file.path === "stops.txt",
        );
        const tripsEntry = directory.files.find(
            (file) => file.path === "trips.txt",
        );
        const shapesEntry = directory.files.find(
            (file) => file.path === "shapes.txt",
        );
        const stopTimesEntry = directory.files.find(
            (file) => file.path === "stop_times.txt",
        );
        const calendarEntry = directory.files.find(
            (file) => file.path === "calendar.txt",
        );
        const calendarDatesEntry = directory.files.find(
            (file) => file.path === "calendar_dates.txt",
        );
        const transfersEntry = directory.files.find(
            (file) => file.path === "transfers.txt",
        );

        if (!routesEntry) {
            throw new Error("routes.txt not found in GTFS archive");
        }

        if (!routeStopsEntry) {
            throw new Error("route_stops.txt not found in GTFS archive");
        }

        if (!stopsEntry) {
            throw new Error("stops.txt not found in GTFS archive");
        }

        if (!tripsEntry) {
            throw new Error("trips.txt not found in GTFS archive");
        }

        if (!shapesEntry) {
            throw new Error("shapes.txt not found in GTFS archive");
        }

        if (!stopTimesEntry) {
            throw new Error("stop_times.txt not found in GTFS archive");
        }

        const rawRoutes = await parseCsvString<Record<string, string>>(
            (await routesEntry.buffer()).toString(),
        );
        const rawRouteStops = await parseCsvString<Record<string, string>>(
            (await routeStopsEntry.buffer()).toString(),
        );
        let rawStops: Record<string, string>[] | null =
            await parseCsvString<Record<string, string>>(
                (await stopsEntry.buffer()).toString(),
            );
        let rawTrips: Record<string, string>[] | null =
            await parseCsvString<Record<string, string>>(
                (await tripsEntry.buffer()).toString(),
            );
        let rawShapePoints: Record<string, string>[] | null =
            await parseCsvString<Record<string, string>>(
                (await shapesEntry.buffer()).toString(),
            );
        let rawStopTimes: Record<string, string>[] | null =
            await parseCsvString<Record<string, string>>(
                (await stopTimesEntry.buffer()).toString(),
            );
        let rawCalendars: Record<string, string>[] | null = calendarEntry
            ? await parseCsvString<Record<string, string>>(
                  (await calendarEntry.buffer()).toString(),
              )
            : [];
        let rawCalendarDates: Record<string, string>[] | null =
            calendarDatesEntry
                ? await parseCsvString<Record<string, string>>(
                      (await calendarDatesEntry.buffer()).toString(),
                  )
                : [];
        let rawTransfers: Record<string, string>[] | null = transfersEntry
            ? await parseCsvString<Record<string, string>>(
                  (await transfersEntry.buffer()).toString(),
              )
            : [];

        const gtfsRoutes = rawRoutes.map((route) =>
            this.parseGtfsRouteRecord(route),
        );
        const gtfsRouteStops = rawRouteStops
            .map((routeStop) => this.parseGtfsRouteStopRecord(routeStop))
            .filter((routeStop) => platformIds.has(routeStop.platformId));
        const routeIdsWithImportedPlatforms = new Set(
            gtfsRouteStops.map((routeStop) => routeStop.routeId),
        );
        const { gtfsRouteShapes } = buildGtfsShapeDatasets({
            feedId: GtfsFeedId.PID,
            trips: rawTrips.map((record) => this.parseGtfsTripRecord(record)),
            shapePoints: rawShapePoints.map((shapePointRecord) =>
                this.parseGtfsShapePointRecord(shapePointRecord),
            ),
            routeIdsWithImportedPlatforms,
        });
        rawShapePoints = null;

        const { gtfsStationEntrances } = buildGtfsStationEntranceDataset({
            feedId: GtfsFeedId.PID,
            stops: rawStops.map((stopRecord) =>
                this.parseGtfsStopRecord(stopRecord),
            ),
            importedMetroStopIds,
        });
        rawStops = null;

        const gtfsPersistenceSnapshot = buildGtfsPersistenceSnapshot({
            feedId: GtfsFeedId.PID,
            trips: rawTrips,
            stopTimes: rawStopTimes,
            calendars: rawCalendars,
            calendarDates: rawCalendarDates,
            transfers: rawTransfers,
            mapStopId: (stopId) => this.normalizePlatformId(stopId),
        });
        rawTrips = null;
        rawStopTimes = null;
        rawCalendars = null;
        rawCalendarDates = null;
        rawTransfers = null;

        return {
            gtfsRoutes,
            gtfsRouteStops,
            gtfsRouteShapes,
            gtfsStationEntrances,
            gtfsTrips: gtfsPersistenceSnapshot.gtfsTrips,
            gtfsStopTimes: gtfsPersistenceSnapshot.gtfsStopTimes,
            gtfsCalendars: gtfsPersistenceSnapshot.gtfsCalendars,
            gtfsCalendarDates: gtfsPersistenceSnapshot.gtfsCalendarDates,
            gtfsTransfers: gtfsPersistenceSnapshot.gtfsTransfers,
        };
    }

    private parseGtfsRouteRecord(route: Record<string, string>) {
        const parsed = gtfsRouteRecordSchema.safeParse(route);

        if (!parsed.success) {
            throw new Error(
                `Invalid GTFS route record: ${parsed.error.message}`,
            );
        }

        return {
            id: parsed.data.route_id,
            feedId: GtfsFeedId.PID,
            shortName: parsed.data.route_short_name,
            longName: this.toOptionalString(parsed.data.route_long_name),
            type: parsed.data.route_type,
            color: this.toOptionalString(parsed.data.route_color),
            isNight: this.parseNightFlag(parsed.data.is_night),
            url: this.toOptionalString(parsed.data.route_url),
        };
    }

    private parseGtfsRouteStopRecord(routeStop: Record<string, string>) {
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
            feedId: GtfsFeedId.PID,
            routeId: parsed.data.route_id,
            directionId: parsed.data.direction_id,
            platformId: this.normalizePlatformId(parsed.data.stop_id),
            stopSequence,
        };
    }

    private parseGtfsStopRecord(stop: Record<string, string>) {
        const parsed = gtfsStopRecordSchema.safeParse(stop);

        if (!parsed.success) {
            throw new Error(
                `Invalid GTFS stop record: ${parsed.error.message}`,
            );
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
                this.toOptionalString(parsed.data.location_type) ??
                GTFS_LOCATION_TYPE_STOP,
            parentStationId: parsed.data.parent_station
                ? normalizeGtfsStopId(parsed.data.parent_station)
                : null,
        };
    }

    private parseGtfsTripRecord(trip: Record<string, string>) {
        const parsed = gtfsTripRecordSchema.safeParse(trip);

        if (!parsed.success) {
            throw new Error(
                `Invalid GTFS trip record: ${parsed.error.message}`,
            );
        }

        return {
            routeId: parsed.data.route_id,
            directionId: this.toDirectionId(parsed.data.direction_id),
            shapeId: this.toOptionalString(parsed.data.shape_id),
        };
    }

    private parseGtfsShapePointRecord(shapePoint: Record<string, string>) {
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
    }

    private normalizePlatformId(stopId: string): string {
        return stopId.split("_")[0];
    }

    private toDirectionId(value?: string): string {
        return this.toOptionalString(value) ?? UNKNOWN_DIRECTION_ID;
    }

    private parseNightFlag(value?: string): boolean | null {
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
    }

    private toOptionalString(value?: string): string | null {
        if (value === undefined) {
            return null;
        }

        const trimmed = value.trim();

        return trimmed.length > 0 ? trimmed : null;
    }
}
