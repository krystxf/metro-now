import { type GeoJsonLineString, GtfsFeedId } from "@metro-now/database";
import { Open as unzipperOpen } from "unzipper";

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
import { fetchWithTimeout } from "../../utils/fetch.utils";
import { logger } from "../../utils/logger";
import { buildGtfsPersistenceSnapshot } from "../gtfs/gtfs-persistence.utils";
import {
    type NeTExJourneyPattern,
    type NeTExLine,
    type NeTExServiceJourney,
    type NeTExStopAssignment,
    type NeTExStopPlace,
    type NeTExUicOperatingPeriod,
    expandValidDayBits,
    extractCisCode,
    normalizeNeTExTime,
    parseNeTExXml,
} from "./cisjr-netex-parser.utils";
import { type Sr70Station, parseSr70Xlsx } from "./cisjr-sr70.utils";
import { classifyImportedRoute } from "./route-classification.utils";

const CISJR_RAIL_URL =
    "https://portal.cisjr.cz/pub/netex/NeTEx_GVD2026.zip";

const CISJR_UPDATE_URLS = [
    "https://portal.cisjr.cz/pub/netex/NeTEx_GVD2026_updates_2025-11.zip",
    "https://portal.cisjr.cz/pub/netex/NeTEx_GVD2026_updates_2025-12.zip",
    "https://portal.cisjr.cz/pub/netex/NeTEx_GVD2026_updates_2026-01.zip",
    "https://portal.cisjr.cz/pub/netex/NeTEx_GVD2026_updates_2026-02.zip",
    "https://portal.cisjr.cz/pub/netex/NeTEx_GVD2026_updates_2026-03.zip",
    "https://portal.cisjr.cz/pub/netex/NeTEx_GVD2026_updates_2026-04.zip",
];

const SR70_URL =
    "https://provoz.spravazeleznic.cz/portal/Show.aspx?oid=2318919";

const CISJR_STOP_PREFIX = "CJS:";
const CISJR_PLATFORM_PREFIX = "CJP:";
const CISJR_ROUTE_PREFIX = "CJR:";

const DOWNLOAD_TIMEOUT_MS = 120_000;

const TRANSPORT_MODE_TO_GTFS_ROUTE_TYPE: Record<string, string> = {
    rail: "2",
    metro: "1",
    tram: "0",
    bus: "3",
    trolleyBus: "11",
    water: "4",
    funicular: "7",
};

const toCisjrStopId = (cisCode: string): string =>
    `${CISJR_STOP_PREFIX}${cisCode}`;
const toCisjrPlatformId = (cisCode: string): string =>
    `${CISJR_PLATFORM_PREFIX}${cisCode}`;
const toCisjrRouteId = (lineId: string): string =>
    `${CISJR_ROUTE_PREFIX}${lineId}`;

export type CisjrSnapshot = StopSnapshot & {
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

type AccumulatedData = {
    stopsByCisCode: Map<string, NeTExStopPlace>;
    linesById: Map<string, NeTExLine & { routeType: string }>;
    tripRecords: Record<string, string>[];
    stopTimeRecords: Record<string, string>[];
    calendarDatesByServiceId: Map<string, Set<string>>;
    patternsByRouteAndDirection: Map<string, Map<string, DominantPattern>>;
    platformRouteSet: Set<string>;
    serviceIdByPaId: Map<string, string>;
};

type DominantPattern = {
    directionId: string;
    platformIds: string[];
    tripCount: number;
};

export class CisjrImportService {
    async getCisjrSnapshot(): Promise<CisjrSnapshot> {
        logger.info("CISJR: Starting import");

        const [netexBuffer, updateBuffers, sr70Stations] = await Promise.all([
            this.downloadNetexArchive(),
            this.downloadUpdateArchives(),
            this.downloadSr70Stations(),
        ]);

        logger.info("CISJR: Downloads complete", {
            sr70Stations: sr70Stations.size,
            updateArchives: updateBuffers.length,
        });

        const accumulated = await this.processNetexArchive(
            netexBuffer,
            sr70Stations,
        );

        // Process update archives (KADR modifications)
        for (const updateBuffer of updateBuffers) {
            await this.processUpdateArchive(
                updateBuffer,
                accumulated,
                sr70Stations,
            );
        }

        return this.buildSnapshot(accumulated, sr70Stations);
    }

    private async downloadNetexArchive(): Promise<Buffer> {
        const response = await fetchWithTimeout(
            CISJR_RAIL_URL,
            {},
            DOWNLOAD_TIMEOUT_MS,
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch CISJR NeTEx archive: ${response.status}`,
            );
        }

        return Buffer.from(await response.arrayBuffer());
    }

    private async downloadSr70Stations(): Promise<Map<string, Sr70Station>> {
        const response = await fetchWithTimeout(
            SR70_URL,
            {},
            DOWNLOAD_TIMEOUT_MS,
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch SR70 station register: ${response.status}`,
            );
        }

        const xlsxBuffer = Buffer.from(await response.arrayBuffer());

        return parseSr70Xlsx(xlsxBuffer);
    }

    private async downloadUpdateArchives(): Promise<Buffer[]> {
        const buffers: Buffer[] = [];

        for (const url of CISJR_UPDATE_URLS) {
            try {
                const response = await fetchWithTimeout(
                    url,
                    {},
                    DOWNLOAD_TIMEOUT_MS,
                );

                if (response.ok) {
                    buffers.push(Buffer.from(await response.arrayBuffer()));
                }
            } catch {
                logger.warn(`CISJR: Failed to download update ${url}`);
            }
        }

        return buffers;
    }

    private async processNetexArchive(
        archiveBuffer: Buffer,
        sr70Stations: Map<string, Sr70Station>,
    ): Promise<AccumulatedData> {
        const directory = await unzipperOpen.buffer(archiveBuffer);

        const accumulated: AccumulatedData = {
            stopsByCisCode: new Map(),
            linesById: new Map(),
            tripRecords: [],
            stopTimeRecords: [],
            calendarDatesByServiceId: new Map(),
            patternsByRouteAndDirection: new Map(),
            platformRouteSet: new Set(),
            serviceIdByPaId: new Map(),
        };

        let filesProcessed = 0;
        let filesSkipped = 0;

        for (const entry of directory.files) {
            if (!entry.path.endsWith(".xml")) {
                continue;
            }

            try {
                const xmlContent = (await entry.buffer()).toString("utf-8");

                this.processNeTExFile(
                    xmlContent,
                    accumulated,
                    sr70Stations,
                );
                filesProcessed++;

                if (filesProcessed % 2000 === 0) {
                    logger.info("CISJR: Processing progress", {
                        filesProcessed,
                        uniqueStops: accumulated.stopsByCisCode.size,
                        trips: accumulated.tripRecords.length,
                    });
                }
            } catch {
                filesSkipped++;
            }
        }

        logger.info("CISJR: Archive processing complete", {
            filesProcessed,
            filesSkipped,
            uniqueStops: accumulated.stopsByCisCode.size,
            uniqueRoutes: accumulated.linesById.size,
            trips: accumulated.tripRecords.length,
            stopTimes: accumulated.stopTimeRecords.length,
            calendarServiceIds: accumulated.calendarDatesByServiceId.size,
        });

        return accumulated;
    }

    private processNeTExFile(
        xmlContent: string,
        accumulated: AccumulatedData,
        sr70Stations: Map<string, Sr70Station>,
    ): void {
        const parsed = parseNeTExXml(xmlContent);

        if (
            parsed.serviceJourneys.length === 0 ||
            parsed.journeyPatterns.length === 0
        ) {
            return;
        }

        // Collect stops (deduplicate by CIS code)
        for (const stop of parsed.stopPlaces) {
            if (stop.cisCode && !accumulated.stopsByCisCode.has(stop.cisCode)) {
                accumulated.stopsByCisCode.set(stop.cisCode, stop);
            }
        }

        // Build stop assignment lookup: scheduledStopPointRef -> stopPlaceRef
        const stopPointToStopPlace = new Map<string, string>();

        for (const sa of parsed.stopAssignments) {
            stopPointToStopPlace.set(
                sa.scheduledStopPointRef,
                sa.stopPlaceRef,
            );
        }

        // Build journey pattern lookup
        const patternsById = new Map<string, NeTExJourneyPattern>();

        for (const jp of parsed.journeyPatterns) {
            patternsById.set(jp.id, jp);
        }

        // Build operating period lookup and day type -> period mapping
        const periodsById = new Map<string, NeTExUicOperatingPeriod>();

        for (const op of parsed.operatingPeriods) {
            periodsById.set(op.id, op);
        }

        const dayTypeToPeriods = new Map<string, NeTExUicOperatingPeriod[]>();

        for (const dta of parsed.dayTypeAssignments) {
            const period = periodsById.get(dta.operatingPeriodRef);

            if (!period) {
                continue;
            }

            const periods = dayTypeToPeriods.get(dta.dayTypeRef) ?? [];

            periods.push(period);
            dayTypeToPeriods.set(dta.dayTypeRef, periods);
        }

        // Collect lines
        for (const line of parsed.lines) {
            if (!accumulated.linesById.has(line.id)) {
                accumulated.linesById.set(line.id, {
                    ...line,
                    routeType:
                        TRANSPORT_MODE_TO_GTFS_ROUTE_TYPE[
                            line.transportMode
                        ] ?? "2",
                });
            }
        }

        // Process each service journey
        for (const journey of parsed.serviceJourneys) {
            const pattern = patternsById.get(journey.journeyPatternRef);

            if (!pattern) {
                continue;
            }

            const line = accumulated.linesById.get(pattern.lineRef);

            if (!line) {
                continue;
            }

            const routeId = toCisjrRouteId(line.id);
            const serviceId = journey.id;

            // Build passing time lookup by stop point ref
            const passingTimeByRef = new Map(
                journey.passingTimes.map((pt) => [pt.stopPointRef, pt]),
            );

            // Resolve stop sequence with CIS codes and times
            const resolvedStops: Array<{
                cisCode: string;
                platformId: string;
                arrivalTime: string | null;
                departureTime: string | null;
            }> = [];

            for (const spijp of pattern.stops) {
                const stopPlaceRef = stopPointToStopPlace.get(
                    spijp.scheduledStopPointRef,
                );

                if (!stopPlaceRef) {
                    continue;
                }

                const cisCode = extractCisCode(stopPlaceRef);

                if (!cisCode || !sr70Stations.has(cisCode)) {
                    continue;
                }

                const pt = passingTimeByRef.get(spijp.id);
                const platformId = toCisjrPlatformId(cisCode);

                resolvedStops.push({
                    cisCode,
                    platformId,
                    arrivalTime: pt
                        ? normalizeNeTExTime(
                              pt.arrivalTime,
                              pt.arrivalDayOffset,
                          )
                        : null,
                    departureTime: pt
                        ? normalizeNeTExTime(
                              pt.departureTime,
                              pt.departureDayOffset,
                          )
                        : null,
                });

                // Track platform-route relationship
                accumulated.platformRouteSet.add(`${platformId}::${routeId}`);
            }

            if (resolvedStops.length < 2) {
                return;
            }

            // Determine headsign (last stop name)
            const lastStop = resolvedStops[resolvedStops.length - 1];
            const lastStopData = lastStop
                ? accumulated.stopsByCisCode.get(lastStop.cisCode)
                : undefined;
            const headsign = lastStopData?.name ?? "";

            // Determine direction (0 by default for rail)
            const directionId = "0";

            // Create trip record (GTFS format)
            accumulated.tripRecords.push({
                trip_id: journey.id,
                route_id: line.id,
                service_id: serviceId,
                direction_id: directionId,
                trip_headsign: headsign,
            });

            // Create stop time records
            for (let i = 0; i < resolvedStops.length; i++) {
                const stop = resolvedStops[i];

                if (!stop) {
                    continue;
                }

                accumulated.stopTimeRecords.push({
                    trip_id: journey.id,
                    stop_id: stop.cisCode,
                    stop_sequence: String(i),
                    arrival_time: stop.arrivalTime ?? "",
                    departure_time: stop.departureTime ?? "",
                });
            }

            // Create calendar dates from day type bitmap
            const serviceDates =
                accumulated.calendarDatesByServiceId.get(serviceId) ??
                new Set<string>();

            for (const dayTypeRef of journey.dayTypeRefs) {
                const periods = dayTypeToPeriods.get(dayTypeRef);

                if (!periods) {
                    continue;
                }

                for (const period of periods) {
                    for (const date of expandValidDayBits(
                        period.fromDate,
                        period.validDayBits,
                    )) {
                        serviceDates.add(date);
                    }
                }
            }

            accumulated.calendarDatesByServiceId.set(serviceId, serviceDates);

            // Track PA identifier → service ID for KADR updates
            if (journey.plannedTransportId) {
                accumulated.serviceIdByPaId.set(
                    journey.plannedTransportId,
                    serviceId,
                );
            }

            // Track route stop patterns for dominant pattern analysis
            const platformIds = resolvedStops.map((s) => s.platformId);
            const patternKey = platformIds.join(">");
            const routeDirectionKey = `${line.id}::${directionId}`;
            const patterns =
                accumulated.patternsByRouteAndDirection.get(
                    routeDirectionKey,
                ) ?? new Map<string, DominantPattern>();
            const currentPattern = patterns.get(patternKey);

            if (currentPattern) {
                currentPattern.tripCount += 1;
            } else {
                patterns.set(patternKey, {
                    directionId,
                    platformIds,
                    tripCount: 1,
                });
            }

            accumulated.patternsByRouteAndDirection.set(
                routeDirectionKey,
                patterns,
            );
        }
    }

    private async processUpdateArchive(
        archiveBuffer: Buffer,
        accumulated: AccumulatedData,
        sr70Stations: Map<string, Sr70Station>,
    ): Promise<void> {
        const directory = await unzipperOpen.buffer(archiveBuffer);
        let kadrProcessed = 0;
        let datesRemoved = 0;

        for (const entry of directory.files) {
            if (!entry.path.endsWith(".xml")) {
                continue;
            }

            try {
                const xmlContent = (await entry.buffer()).toString("utf-8");
                const parsed = parseNeTExXml(xmlContent);

                for (const journey of parsed.serviceJourneys) {
                    // Build operating dates for this KADR journey
                    const periodsById = new Map(
                        parsed.operatingPeriods.map((p) => [p.id, p]),
                    );
                    const dayTypeToPeriods = new Map<
                        string,
                        typeof parsed.operatingPeriods
                    >();

                    for (const dta of parsed.dayTypeAssignments) {
                        const period = periodsById.get(dta.operatingPeriodRef);

                        if (period) {
                            const periods =
                                dayTypeToPeriods.get(dta.dayTypeRef) ?? [];

                            periods.push(period);
                            dayTypeToPeriods.set(dta.dayTypeRef, periods);
                        }
                    }

                    const kadrDates = new Set<string>();

                    for (const dayTypeRef of journey.dayTypeRefs) {
                        for (const period of dayTypeToPeriods.get(
                            dayTypeRef,
                        ) ?? []) {
                            for (const date of expandValidDayBits(
                                period.fromDate,
                                period.validDayBits,
                            )) {
                                kadrDates.add(date);
                            }
                        }
                    }

                    // Remove KADR dates from related base train calendars
                    for (const relatedPaId of journey.relatedPlannedTransportIds) {
                        const baseServiceId =
                            accumulated.serviceIdByPaId.get(relatedPaId);

                        if (!baseServiceId) {
                            continue;
                        }

                        const baseDates =
                            accumulated.calendarDatesByServiceId.get(
                                baseServiceId,
                            );

                        if (!baseDates) {
                            continue;
                        }

                        for (const date of kadrDates) {
                            if (baseDates.delete(date)) {
                                datesRemoved++;
                            }
                        }
                    }

                    // Add KADR journey as a new trip
                    this.processNeTExFile(xmlContent, accumulated, sr70Stations);
                    kadrProcessed++;
                    break; // One journey per file
                }
            } catch {
                // Skip unparseable update files
            }
        }

        logger.info("CISJR: Update archive processed", {
            kadrProcessed,
            datesRemoved,
        });
    }

    private buildSnapshot(
        accumulated: AccumulatedData,
        sr70Stations: Map<string, Sr70Station>,
    ): CisjrSnapshot {
        // Build stops and platforms
        const stops = [...accumulated.stopsByCisCode.entries()]
            .filter(([cisCode]) => sr70Stations.has(cisCode))
            .map(([cisCode, stopPlace]) => {
                const station = sr70Stations.get(cisCode);

                return {
                    id: toCisjrStopId(cisCode),
                    name: stopPlace.name,
                    feed: GtfsFeedId.CISJR,
                    avgLatitude: station?.latitude ?? 0,
                    avgLongitude: station?.longitude ?? 0,
                };
            });

        const platforms = stops.map((stop) => {
            const cisCode = stop.id.slice(CISJR_STOP_PREFIX.length);

            return {
                id: toCisjrPlatformId(cisCode),
                name: stop.name,
                code: null,
                isMetro: false,
                latitude: stop.avgLatitude,
                longitude: stop.avgLongitude,
                stopId: stop.id,
            };
        });

        // Build routes
        const routes = [...accumulated.linesById.values()].map((line) => {
            const classification = classifyImportedRoute({
                feedId: GtfsFeedId.CISJR,
                routeShortName: line.publicCode ?? line.name,
                routeType: line.routeType,
            });

            return {
                id: toCisjrRouteId(line.id),
                name: line.publicCode ?? line.name,
                vehicleType: classification.vehicleType,
                isNight: classification.isNight,
            };
        });

        // Build platform routes
        const platformRoutes = [...accumulated.platformRouteSet].map(
            (key) => {
                const [platformId, routeId] = key.split("::");

                return {
                    platformId: platformId ?? "",
                    routeId: routeId ?? "",
                };
            },
        );

        // Build GTFS routes
        const gtfsRoutes: SyncedGtfsRoute[] = [
            ...accumulated.linesById.values(),
        ].map((line) => ({
            id: toCisjrRouteId(line.id),
            feedId: GtfsFeedId.CISJR,
            shortName: line.publicCode ?? line.name,
            longName: line.name !== (line.publicCode ?? line.name) ? line.name : null,
            type: line.routeType,
            color: null,
            isNight: null,
            url: null,
        }));

        // Build GTFS route stops from dominant patterns
        const gtfsRouteStops = this.buildGtfsRouteStops(accumulated);

        // Build GTFS route shapes from dominant patterns
        const gtfsRouteShapes = this.buildGtfsRouteShapes(
            accumulated,
            sr70Stations,
        );

        // Flatten calendar dates from map to GTFS records
        const calendarDateRecords: Record<string, string>[] = [];

        for (const [serviceId, dates] of accumulated.calendarDatesByServiceId) {
            for (const date of dates) {
                calendarDateRecords.push({
                    service_id: serviceId,
                    date,
                    exception_type: "1",
                });
            }
        }

        // Build GTFS persistence data
        const gtfsPersistence = buildGtfsPersistenceSnapshot({
            feedId: GtfsFeedId.CISJR,
            trips: accumulated.tripRecords,
            stopTimes: accumulated.stopTimeRecords,
            calendarDates: calendarDateRecords,
            mapRouteId: toCisjrRouteId,
            mapStopId: toCisjrPlatformId,
        });

        logger.info("CISJR: Snapshot built", {
            stops: stops.length,
            platforms: platforms.length,
            routes: routes.length,
            gtfsRoutes: gtfsRoutes.length,
            gtfsTrips: gtfsPersistence.gtfsTrips.length,
            gtfsStopTimes: gtfsPersistence.gtfsStopTimes.length,
            gtfsCalendarDates: gtfsPersistence.gtfsCalendarDates.length,
        });

        return {
            stops,
            platforms,
            routes,
            platformRoutes,
            gtfsRoutes,
            gtfsRouteStops,
            gtfsRouteShapes,
            gtfsStationEntrances: [],
            gtfsTrips: gtfsPersistence.gtfsTrips,
            gtfsStopTimes: gtfsPersistence.gtfsStopTimes,
            gtfsCalendars: [],
            gtfsCalendarDates: gtfsPersistence.gtfsCalendarDates,
            gtfsTransfers: [],
        };
    }

    private buildGtfsRouteStops(
        accumulated: AccumulatedData,
    ): SyncedGtfsRouteStop[] {
        const routeStops: SyncedGtfsRouteStop[] = [];

        for (const [, patterns] of accumulated.patternsByRouteAndDirection) {
            const dominant = [...patterns.values()].sort(
                (a, b) =>
                    b.tripCount - a.tripCount ||
                    b.platformIds.length - a.platformIds.length,
            )[0];

            if (!dominant) {
                continue;
            }

            const routeId = toCisjrRouteId(
                [...accumulated.patternsByRouteAndDirection.entries()].find(
                    ([, p]) => p === patterns,
                )?.[0]?.split("::")[0] ?? "",
            );

            for (const [index, platformId] of dominant.platformIds.entries()) {
                routeStops.push({
                    feedId: GtfsFeedId.CISJR,
                    routeId,
                    directionId: dominant.directionId,
                    platformId,
                    stopSequence: index,
                });
            }
        }

        return routeStops;
    }

    private buildGtfsRouteShapes(
        accumulated: AccumulatedData,
        sr70Stations: Map<string, Sr70Station>,
    ): SyncedGtfsRouteShape[] {
        const routeShapes: SyncedGtfsRouteShape[] = [];

        for (const [
            routeDirectionKey,
            patterns,
        ] of accumulated.patternsByRouteAndDirection) {
            const dominant = [...patterns.values()].sort(
                (a, b) =>
                    b.tripCount - a.tripCount ||
                    b.platformIds.length - a.platformIds.length,
            )[0];

            if (!dominant || dominant.platformIds.length < 2) {
                continue;
            }

            const [lineId, directionId] = routeDirectionKey.split("::");
            const coordinates: GeoJsonLineString["coordinates"] = [];

            for (const platformId of dominant.platformIds) {
                const cisCode = platformId.slice(CISJR_PLATFORM_PREFIX.length);
                const station = sr70Stations.get(cisCode);

                if (station) {
                    coordinates.push([station.longitude, station.latitude]);
                }
            }

            // Deduplicate consecutive identical coordinates
            const deduped = coordinates.filter(
                (coord, index) =>
                    index === 0 ||
                    coord[0] !== coordinates[index - 1]?.[0] ||
                    coord[1] !== coordinates[index - 1]?.[1],
            );

            if (deduped.length < 2) {
                continue;
            }

            routeShapes.push({
                feedId: GtfsFeedId.CISJR,
                routeId: toCisjrRouteId(lineId ?? ""),
                directionId: directionId ?? "0",
                shapeId: `generated:cisjr:${lineId}:${directionId}`,
                tripCount: dominant.tripCount,
                isPrimary: true,
                geoJson: { type: "LineString", coordinates: deduped },
            });
        }

        return routeShapes;
    }
}
