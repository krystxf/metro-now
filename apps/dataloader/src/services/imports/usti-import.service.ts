import { type GeoJsonLineString, GtfsFeedId } from "@metro-now/database";
import { Open as unzipperOpen } from "unzipper";
import { z } from "zod";

import type {
    StopSnapshot,
    SyncedGtfsCalendar,
    SyncedGtfsCalendarDate,
    SyncedGtfsRoute,
    SyncedGtfsRouteShape,
    SyncedGtfsRouteStop,
    SyncedGtfsStationEntrance,
    SyncedGtfsStopTime,
    SyncedGtfsTransfer,
    SyncedGtfsTrip,
} from "../../types/sync.types";
import { parseCsvString } from "../../utils/csv.utils";
import { fetchWithTimeout } from "../../utils/fetch.utils";
import { buildGtfsPersistenceSnapshot } from "../gtfs/gtfs-persistence.utils";
import { classifyImportedRoute } from "./route-classification.utils";

const USTI_GTFS_ARCHIVE_URL =
    "https://tabule.portabo.cz/api/v1-tabule/cis/GetGtfs/gtfs_google_all";

const USTI_STOP_PREFIX = "USS:";
const USTI_PLATFORM_PREFIX = "USP:";
const USTI_ROUTE_PREFIX = "USR:";

const LOCATION_TYPE_PLATFORM = new Set(["0", "4"]);
const LOCATION_TYPE_ENTRANCE = "2";
const EMPTY_LOCATION_TYPE = "0";

const toUstiStopId = (gtfsStopId: string): string =>
    `${USTI_STOP_PREFIX}${gtfsStopId}`;
const toUstiPlatformId = (gtfsStopId: string): string =>
    `${USTI_PLATFORM_PREFIX}${gtfsStopId}`;
const toUstiRouteId = (gtfsRouteId: string): string =>
    `${USTI_ROUTE_PREFIX}${gtfsRouteId}`;

const routeRowSchema = z.object({
    route_id: z.string().min(1),
    route_short_name: z.string().min(1),
    route_long_name: z.string().optional(),
    route_type: z.string().min(1),
    route_url: z.string().optional(),
    route_color: z.string().optional(),
});

const tripRowSchema = z.object({
    trip_id: z.string().min(1),
    route_id: z.string().min(1),
    direction_id: z.string().optional(),
});

const stopRowSchema = z.object({
    stop_id: z.string().min(1),
    stop_name: z.string(),
    stop_lat: z.string().min(1),
    stop_lon: z.string().min(1),
    location_type: z.string().optional(),
    parent_station: z.string().optional(),
    platform_code: z.string().optional(),
});

const stopTimeRowSchema = z.object({
    trip_id: z.string().min(1),
    stop_id: z.string().min(1),
    stop_sequence: z.string().min(1),
});

type ParsedStop = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    locationType: string;
    parentStationId: string | null;
    platformCode: string | null;
};

type ParsedRoute = {
    id: string;
    shortName: string;
    longName: string | null;
    type: string;
    url: string | null;
    color: string | null;
};

type ParsedTrip = {
    id: string;
    routeId: string;
    directionId: string;
};

type ParsedStopTime = {
    tripId: string;
    stopId: string;
    stopSequence: number;
};

type LogicalStop = {
    id: string;
    gtfsStopId: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
    platforms: LogicalPlatform[];
    entrances: LogicalEntrance[];
};

type LogicalPlatform = {
    id: string;
    name: string;
    code: string | null;
    latitude: number;
    longitude: number;
    stopId: string;
    routeIds: Set<string>;
};

type LogicalEntrance = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
};

type DominantPattern = {
    directionId: string;
    platformIds: string[];
    tripCount: number;
};

export type UstiSnapshot = StopSnapshot & {
    gtfsRoutes: SyncedGtfsRoute[];
    gtfsRouteStops: SyncedGtfsRouteStop[];
    gtfsRouteShapes: SyncedGtfsRouteShape[];
    gtfsStationEntrances: SyncedGtfsStationEntrance[];
    gtfsTrips: SyncedGtfsTrip[];
    gtfsStopTimes: SyncedGtfsStopTime[];
    gtfsCalendars: SyncedGtfsCalendar[];
    gtfsCalendarDates: SyncedGtfsCalendarDate[];
    gtfsTransfers: SyncedGtfsTransfer[];
};

const toOptionalString = (value?: string): string | null => {
    if (value === undefined) {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
};

export class UstiImportService {
    async getUstiSnapshot(): Promise<UstiSnapshot> {
        const response = await fetchWithTimeout(USTI_GTFS_ARCHIVE_URL);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch Usti GTFS archive: ${response.status} ${response.statusText}`,
            );
        }

        const directory = await unzipperOpen.buffer(
            Buffer.from(await response.arrayBuffer()),
        );
        const getFile = (path: string): Promise<string> => {
            const file = directory.files.find((entry) => entry.path === path);

            if (!file) {
                throw new Error(`Usti GTFS archive is missing '${path}'`);
            }

            return file.buffer().then((buffer) => buffer.toString());
        };
        const getOptionalFile = async (
            path: string,
        ): Promise<string | null> => {
            const file = directory.files.find((entry) => entry.path === path);

            if (!file) {
                return null;
            }

            return file.buffer().then((buffer) => buffer.toString());
        };

        const [
            routesCsv,
            stopsCsv,
            stopTimesCsv,
            tripsCsv,
            calendarCsv,
            calendarDatesCsv,
            transfersCsv,
        ] = await Promise.all([
            getFile("routes.txt"),
            getFile("stops.txt"),
            getFile("stop_times.txt"),
            getFile("trips.txt"),
            getOptionalFile("calendar.txt"),
            getOptionalFile("calendar_dates.txt"),
            getOptionalFile("transfers.txt"),
        ]);

        return this.buildSnapshot({
            routesCsv,
            stopsCsv,
            stopTimesCsv,
            tripsCsv,
            calendarCsv,
            calendarDatesCsv,
            transfersCsv,
        });
    }

    private async buildSnapshot({
        routesCsv,
        stopsCsv,
        stopTimesCsv,
        tripsCsv,
        calendarCsv,
        calendarDatesCsv,
        transfersCsv,
    }: {
        routesCsv: string;
        stopsCsv: string;
        stopTimesCsv: string;
        tripsCsv: string;
        calendarCsv: string | null;
        calendarDatesCsv: string | null;
        transfersCsv: string | null;
    }): Promise<UstiSnapshot> {
        const [rawRoutes, rawStops, rawStopTimes, rawTrips] = await Promise.all(
            [
                parseCsvString<Record<string, string>>(routesCsv),
                parseCsvString<Record<string, string>>(stopsCsv),
                parseCsvString<Record<string, string>>(stopTimesCsv),
                parseCsvString<Record<string, string>>(tripsCsv),
            ],
        );
        const [rawCalendars, rawCalendarDates, rawTransfers] =
            await Promise.all([
                calendarCsv
                    ? parseCsvString<Record<string, string>>(calendarCsv)
                    : Promise.resolve([]),
                calendarDatesCsv
                    ? parseCsvString<Record<string, string>>(calendarDatesCsv)
                    : Promise.resolve([]),
                transfersCsv
                    ? parseCsvString<Record<string, string>>(transfersCsv)
                    : Promise.resolve([]),
            ]);

        const ustiRoutes = rawRoutes.map((row) => this.parseRoute(row));
        const ustiRouteIds = new Set(ustiRoutes.map((route) => route.id));
        const ustiTrips = rawTrips
            .map((row) => this.parseTrip(row))
            .filter((trip) => ustiRouteIds.has(trip.routeId));
        const ustiTripById = new Map(
            ustiTrips.map((trip) => [trip.id, trip] as const),
        );
        const ustiStopTimesByTripId = new Map<string, ParsedStopTime[]>();

        for (const stopTime of rawStopTimes.map((row) =>
            this.parseStopTime(row),
        )) {
            if (!ustiTripById.has(stopTime.tripId)) {
                continue;
            }

            const tripStopTimes =
                ustiStopTimesByTripId.get(stopTime.tripId) ?? [];

            tripStopTimes.push(stopTime);
            ustiStopTimesByTripId.set(stopTime.tripId, tripStopTimes);
        }

        const stopsById = new Map(
            rawStops.map((row) => {
                const stop = this.parseStop(row);

                return [stop.id, stop] as const;
            }),
        );
        const referencedStopIds = new Set<string>();

        for (const tripStopTimes of ustiStopTimesByTripId.values()) {
            for (const stopTime of tripStopTimes) {
                referencedStopIds.add(stopTime.stopId);
            }
        }

        const logicalStops = this.buildLogicalStops({
            referencedStopIds,
            stopsById,
        });
        const platformById = new Map(
            logicalStops.flatMap((stop) =>
                stop.platforms.map(
                    (platform) => [platform.id, platform] as const,
                ),
            ),
        );

        const patternsByRouteAndDirection = new Map<
            string,
            Map<string, DominantPattern>
        >();

        for (const trip of ustiTrips) {
            const tripStopTimes = (
                ustiStopTimesByTripId.get(trip.id) ?? []
            ).sort((left, right) => left.stopSequence - right.stopSequence);
            const platformIds = tripStopTimes
                .map((stopTime) => toUstiPlatformId(stopTime.stopId))
                .filter((platformId) => platformById.has(platformId));

            if (platformIds.length === 0) {
                continue;
            }

            for (const platformId of platformIds) {
                platformById
                    .get(platformId)
                    ?.routeIds.add(toUstiRouteId(trip.routeId));
            }

            const routeDirectionKey = `${trip.routeId}::${trip.directionId}`;
            const patternKey = platformIds.join(">");
            const patterns =
                patternsByRouteAndDirection.get(routeDirectionKey) ?? new Map();
            const currentPattern = patterns.get(patternKey);

            if (currentPattern) {
                currentPattern.tripCount += 1;
            } else {
                patterns.set(patternKey, {
                    directionId: trip.directionId,
                    platformIds,
                    tripCount: 1,
                });
            }

            patternsByRouteAndDirection.set(routeDirectionKey, patterns);
        }

        const stops = logicalStops.map((stop) => ({
            id: stop.id,
            feed: GtfsFeedId.USTI,
            name: stop.name,
            avgLatitude: stop.avgLatitude,
            avgLongitude: stop.avgLongitude,
        }));

        const platforms = logicalStops.flatMap((stop) =>
            stop.platforms.map((platform) => ({
                id: platform.id,
                name: platform.name,
                code: platform.code,
                isMetro: false,
                latitude: platform.latitude,
                longitude: platform.longitude,
                stopId: stop.id,
            })),
        );

        const routes = ustiRoutes.map((route) => {
            const classification = classifyImportedRoute({
                feedId: GtfsFeedId.USTI,
                routeShortName: route.shortName,
                routeType: route.type,
            });

            return {
                id: toUstiRouteId(route.id),
                name: route.shortName,
                vehicleType: classification.vehicleType,
                isNight: classification.isNight,
            };
        });

        const platformRoutes = logicalStops.flatMap((stop) =>
            stop.platforms.flatMap((platform) =>
                [...platform.routeIds].map((routeId) => ({
                    platformId: platform.id,
                    routeId,
                })),
            ),
        );

        const gtfsRoutes = ustiRoutes.map((route) => ({
            id: toUstiRouteId(route.id),
            feedId: GtfsFeedId.USTI,
            shortName: route.shortName,
            longName: route.longName,
            type: route.type,
            color: route.color,
            isNight: classifyImportedRoute({
                feedId: GtfsFeedId.USTI,
                routeShortName: route.shortName,
                routeType: route.type,
            }).isNight,
            url: route.url,
        }));

        const gtfsRouteStops = this.buildGtfsRouteStops(
            ustiRoutes,
            patternsByRouteAndDirection,
            platformById,
        );

        const gtfsRouteShapes = this.buildGtfsRouteShapes(
            ustiRoutes,
            patternsByRouteAndDirection,
            platformById,
        );

        const gtfsStationEntrances = logicalStops.flatMap((stop) =>
            stop.entrances.map((entrance) => ({
                id: `${USTI_STOP_PREFIX}entrance:${entrance.id}`,
                feedId: GtfsFeedId.USTI,
                stopId: stop.id,
                parentStationId: stop.gtfsStopId,
                name: entrance.name,
                latitude: entrance.latitude,
                longitude: entrance.longitude,
            })),
        );
        const gtfsPersistenceSnapshot = buildGtfsPersistenceSnapshot({
            feedId: GtfsFeedId.USTI,
            trips: rawTrips,
            stopTimes: rawStopTimes,
            calendars: rawCalendars,
            calendarDates: rawCalendarDates,
            transfers: rawTransfers,
            mapRouteId: toUstiRouteId,
            mapStopId: toUstiPlatformId,
        });

        return {
            stops,
            platforms,
            routes,
            platformRoutes,
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

    private buildLogicalStops({
        referencedStopIds,
        stopsById,
    }: {
        referencedStopIds: Set<string>;
        stopsById: Map<string, ParsedStop>;
    }): LogicalStop[] {
        const childStopsByParentId = new Map<string, ParsedStop[]>();

        for (const stop of stopsById.values()) {
            if (!stop.parentStationId) {
                continue;
            }

            const children =
                childStopsByParentId.get(stop.parentStationId) ?? [];

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

        const logicalStops: LogicalStop[] = [];

        for (const logicalStopSourceId of [...logicalStopIds].sort((a, b) =>
            a.localeCompare(b),
        )) {
            const sourceStop = stopsById.get(logicalStopSourceId);

            if (!sourceStop) {
                continue;
            }

            const children =
                childStopsByParentId.get(logicalStopSourceId) ?? [];
            const platformStops = children.filter((stop) =>
                LOCATION_TYPE_PLATFORM.has(stop.locationType),
            );
            const entranceStops = children.filter(
                (stop) => stop.locationType === LOCATION_TYPE_ENTRANCE,
            );
            const logicalStopId = toUstiStopId(logicalStopSourceId);
            const platformSeeds =
                platformStops.length > 0
                    ? platformStops
                    : LOCATION_TYPE_PLATFORM.has(sourceStop.locationType)
                      ? [sourceStop]
                      : [];

            const platforms: LogicalPlatform[] = platformSeeds
                .map((platformStop) => ({
                    id: toUstiPlatformId(platformStop.id),
                    name: platformStop.name,
                    code: platformStop.platformCode,
                    latitude: platformStop.latitude,
                    longitude: platformStop.longitude,
                    stopId: logicalStopId,
                    routeIds: new Set<string>(),
                }))
                .sort((left, right) => left.id.localeCompare(right.id));
            const entrances: LogicalEntrance[] = entranceStops
                .map((entranceStop) => ({
                    id: entranceStop.id,
                    name: entranceStop.name,
                    latitude: entranceStop.latitude,
                    longitude: entranceStop.longitude,
                }))
                .sort((left, right) => left.id.localeCompare(right.id));
            const coordinatePoints =
                platforms.length > 0
                    ? platforms
                    : entrances.length > 0
                      ? entrances
                      : [sourceStop];
            const avgLatitude =
                coordinatePoints.reduce(
                    (sum, point) => sum + point.latitude,
                    0,
                ) / coordinatePoints.length;
            const avgLongitude =
                coordinatePoints.reduce(
                    (sum, point) => sum + point.longitude,
                    0,
                ) / coordinatePoints.length;

            logicalStops.push({
                id: logicalStopId,
                gtfsStopId: logicalStopSourceId,
                name: sourceStop.name,
                avgLatitude,
                avgLongitude,
                platforms,
                entrances,
            });
        }

        return logicalStops;
    }

    private buildGtfsRouteStops(
        ustiRoutes: ParsedRoute[],
        patternsByRouteAndDirection: Map<string, Map<string, DominantPattern>>,
        platformById: Map<string, LogicalPlatform>,
    ): SyncedGtfsRouteStop[] {
        const routeStops: SyncedGtfsRouteStop[] = [];

        for (const route of ustiRoutes) {
            const dominantPattern = this.getDominantPattern(
                route,
                patternsByRouteAndDirection,
            );

            for (const { pattern } of dominantPattern) {
                for (const [
                    index,
                    platformId,
                ] of pattern.platformIds.entries()) {
                    if (!platformById.has(platformId)) {
                        continue;
                    }

                    routeStops.push({
                        feedId: GtfsFeedId.USTI,
                        routeId: toUstiRouteId(route.id),
                        directionId: pattern.directionId,
                        platformId,
                        stopSequence: index,
                    });
                }
            }
        }

        return routeStops;
    }

    private buildGtfsRouteShapes(
        ustiRoutes: ParsedRoute[],
        patternsByRouteAndDirection: Map<string, Map<string, DominantPattern>>,
        platformById: Map<string, LogicalPlatform>,
    ): SyncedGtfsRouteShape[] {
        const routeShapes: SyncedGtfsRouteShape[] = [];

        for (const route of ustiRoutes) {
            const dominantPattern = this.getDominantPattern(
                route,
                patternsByRouteAndDirection,
            );

            for (const { pattern } of dominantPattern) {
                const points = pattern.platformIds
                    .map((platformId) => platformById.get(platformId))
                    .filter(
                        (platform): platform is LogicalPlatform =>
                            platform !== undefined,
                    )
                    .map((platform) => ({
                        latitude: platform.latitude,
                        longitude: platform.longitude,
                    }));
                const dedupedPoints = points.filter((point, index) => {
                    if (index === 0) {
                        return true;
                    }

                    const previousPoint = points[index - 1];

                    return (
                        previousPoint?.latitude !== point.latitude ||
                        previousPoint.longitude !== point.longitude
                    );
                });

                if (dedupedPoints.length < 2) {
                    continue;
                }

                routeShapes.push({
                    feedId: GtfsFeedId.USTI,
                    routeId: toUstiRouteId(route.id),
                    directionId: pattern.directionId,
                    shapeId: `generated:${route.id}:${pattern.directionId}`,
                    tripCount: pattern.tripCount,
                    isPrimary: true,
                    geoJson: {
                        type: "LineString",
                        coordinates: dedupedPoints.map(
                            (
                                point,
                            ): GeoJsonLineString["coordinates"][number] => [
                                point.longitude,
                                point.latitude,
                            ],
                        ),
                    },
                });
            }
        }

        return routeShapes;
    }

    private getDominantPattern(
        route: ParsedRoute,
        patternsByRouteAndDirection: Map<string, Map<string, DominantPattern>>,
    ): Array<{ pattern: DominantPattern }> {
        return [...patternsByRouteAndDirection.entries()]
            .filter(([key]) => key.startsWith(`${route.id}::`))
            .map(([, patterns]) => {
                const dominant = [...patterns.values()].sort(
                    (left, right) =>
                        right.tripCount - left.tripCount ||
                        right.platformIds.length - left.platformIds.length ||
                        left.platformIds
                            .join(">")
                            .localeCompare(right.platformIds.join(">")),
                )[0];

                return dominant ? { pattern: dominant } : null;
            })
            .filter(
                (entry): entry is { pattern: DominantPattern } =>
                    entry !== null,
            )
            .sort((left, right) =>
                left.pattern.directionId.localeCompare(
                    right.pattern.directionId,
                ),
            );
    }

    private parseStop(row: Record<string, string>): ParsedStop {
        const parsed = stopRowSchema.parse(row);
        const latitude = Number(parsed.stop_lat);
        const longitude = Number(parsed.stop_lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error(
                `Invalid Usti GTFS stop coordinates for '${parsed.stop_id}'`,
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
    }

    private parseRoute(row: Record<string, string>): ParsedRoute {
        const parsed = routeRowSchema.parse(row);

        return {
            id: parsed.route_id,
            shortName: parsed.route_short_name.trim(),
            longName: toOptionalString(parsed.route_long_name),
            type: parsed.route_type,
            url: toOptionalString(parsed.route_url),
            color: toOptionalString(parsed.route_color),
        };
    }

    private parseTrip(row: Record<string, string>): ParsedTrip {
        const parsed = tripRowSchema.parse(row);

        return {
            id: parsed.trip_id,
            routeId: parsed.route_id,
            directionId: toOptionalString(parsed.direction_id) ?? "0",
        };
    }

    private parseStopTime(row: Record<string, string>): ParsedStopTime {
        const parsed = stopTimeRowSchema.parse(row);
        const stopSequence = Number(parsed.stop_sequence);

        if (!Number.isInteger(stopSequence)) {
            throw new Error(
                `Invalid Usti GTFS stop sequence '${parsed.stop_sequence}'`,
            );
        }

        return {
            tripId: parsed.trip_id,
            stopId: parsed.stop_id,
            stopSequence,
        };
    }
}
