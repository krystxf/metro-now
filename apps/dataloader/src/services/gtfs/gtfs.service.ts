import { Open as unzipperOpen } from "unzipper";

import { GtfsFeedId } from "@metro-now/database";

import type { GtfsSnapshot } from "../../types/sync.types";
import { parseCsvString } from "../../utils/csv.utils";
import { fetchWithTimeout } from "../../utils/fetch.utils";
import { buildGtfsPersistenceSnapshot } from "./gtfs-persistence.utils";
import {
    GTFS_LOCATION_TYPE_ENTRANCE,
    type ParsedGtfsShapePointRecord,
    type ParsedGtfsStopRecord,
    type ParsedGtfsTripRecord,
    normalizeGtfsStopId,
    parseGtfsRouteRecord,
    parseGtfsRouteStopRecord,
    parseGtfsShapePointRecord,
    parseGtfsStopRecord,
    parseGtfsTripRecord,
} from "./gtfs-record-parsers.utils";

const GTFS_ARCHIVE_URL = "https://data.pid.cz/PID_GTFS.zip";

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
        const frequenciesEntry = directory.files.find(
            (file) => file.path === "frequencies.txt",
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
        let rawStops: Record<string, string>[] | null = await parseCsvString<
            Record<string, string>
        >((await stopsEntry.buffer()).toString());
        let rawTrips: Record<string, string>[] | null = await parseCsvString<
            Record<string, string>
        >((await tripsEntry.buffer()).toString());
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
        let rawFrequencies: Record<string, string>[] | null = frequenciesEntry
            ? await parseCsvString<Record<string, string>>(
                  (await frequenciesEntry.buffer()).toString(),
              )
            : [];

        const gtfsRoutes = rawRoutes.map((route) =>
            parseGtfsRouteRecord(route, GtfsFeedId.PID),
        );
        const gtfsRouteStops = rawRouteStops
            .map((routeStop) =>
                parseGtfsRouteStopRecord(routeStop, GtfsFeedId.PID),
            )
            .filter((routeStop) => platformIds.has(routeStop.platformId));
        const routeIdsWithImportedPlatforms = new Set(
            gtfsRouteStops.map((routeStop) => routeStop.routeId),
        );
        const { gtfsRouteShapes } = buildGtfsShapeDatasets({
            feedId: GtfsFeedId.PID,
            trips: rawTrips.map((record) => parseGtfsTripRecord(record)),
            shapePoints: rawShapePoints.map((shapePointRecord) =>
                parseGtfsShapePointRecord(shapePointRecord),
            ),
            routeIdsWithImportedPlatforms,
        });
        rawShapePoints = null;

        const { gtfsStationEntrances } = buildGtfsStationEntranceDataset({
            feedId: GtfsFeedId.PID,
            stops: rawStops.map((stopRecord) =>
                parseGtfsStopRecord(stopRecord),
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
            frequencies: rawFrequencies,
            mapStopId: (stopId) => normalizeGtfsStopId(stopId),
        });
        rawTrips = null;
        rawStopTimes = null;
        rawCalendars = null;
        rawCalendarDates = null;
        rawTransfers = null;
        rawFrequencies = null;

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
            gtfsFrequencies: gtfsPersistenceSnapshot.gtfsFrequencies,
        };
    }
}
