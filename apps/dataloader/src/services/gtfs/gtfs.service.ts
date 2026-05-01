import { Open as unzipperOpen } from "unzipper";

import { GtfsFeedId } from "@metro-now/database";

import type { GtfsSnapshot } from "../../types/sync.types";
import { parseCsvString } from "../../utils/csv.utils";
import { fetchWithTimeout } from "../../utils/fetch.utils";
import { buildGtfsPersistenceSnapshot } from "./gtfs-persistence.utils";
import {
    normalizeGtfsStopId,
    parseGtfsRouteRecord,
    parseGtfsRouteStopRecord,
    parseGtfsShapePointRecord,
    parseGtfsStopRecord,
    parseGtfsTripRecord,
} from "./gtfs-record-parsers.utils";
import {
    buildGtfsShapeDatasets,
    buildGtfsStationEntranceDataset,
} from "./gtfs-shape-datasets.utils";

export { buildGtfsShapeDatasets, buildGtfsStationEntranceDataset };

const GTFS_ARCHIVE_URL = "https://data.pid.cz/PID_GTFS.zip";

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
