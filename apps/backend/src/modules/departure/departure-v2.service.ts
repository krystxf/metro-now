import { GtfsFeedId, type Stop } from "@metro-now/database";
import { Injectable } from "@nestjs/common";

import { uniqueSortedStrings } from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import { DepartureBoardService } from "src/modules/departure/departure-board.service";
import { limitDeparturesPerRoute } from "src/modules/departure/departure-grouping.utils";
import {
    getGtfsServiceDatesForWindow,
    getWeekdayFromGtfsDate,
    parseGtfsTimeToSeconds,
    toPragueDateFromGtfs,
} from "src/modules/departure/prague-gtfs-time.utils";
import {
    type DepartureSchema,
    departureSchema,
} from "src/modules/departure/schema/departure.schema";
import { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import { isLeoPlatformId, isLeoStopId } from "src/modules/leo/leo-id.utils";
import { LeoStopMatcherService } from "src/modules/leo/leo-stop-matcher.service";
import type { VehicleTypeSchema } from "src/schema/metro-only.schema";
import { getDelayInSeconds } from "src/utils/delay";

const ROUTE_ID_BY_NAME = {
    A: "L991",
    B: "L992",
    C: "L993",
} as const;

@Injectable()
export class DepartureServiceV2 {
    private gtfsTimetableFallbackAvailable: boolean | undefined;

    constructor(
        private readonly departureBoardService: DepartureBoardService,
        private readonly database: DatabaseService,
        private readonly leoGtfsService: LeoGtfsService,
        private readonly leoStopMatcherService: LeoStopMatcherService,
    ) {}

    async getDepartures(args: {
        stopIds: string[];
        platformIds: string[];
        vehicleType: VehicleTypeSchema;
        excludeVehicleType: VehicleTypeSchema | null;
        limit: number | null;
        totalLimit: number | null;
        minutesBefore: number;
        minutesAfter: number;
    }): Promise<DepartureSchema[]> {
        const localStopIds = args.stopIds.filter(
            (stopId) => !isLeoStopId(stopId),
        );
        const leoStopIds = args.stopIds.filter((stopId) => isLeoStopId(stopId));
        const localPlatformIds = args.platformIds.filter(
            (platformId) => !isLeoPlatformId(platformId),
        );
        const leoPlatformIds = args.platformIds.filter((platformId) =>
            isLeoPlatformId(platformId),
        );
        const includeLeo = args.vehicleType !== "metro";
        const [localDepartures, leoDepartures] = await Promise.all([
            this.getLocalDepartures({
                stopIds: localStopIds,
                platformIds: localPlatformIds,
                vehicleType: args.vehicleType,
                excludeVehicleType: args.excludeVehicleType,
                totalLimit: args.totalLimit ?? 1_000,
                minutesBefore: args.minutesBefore,
                minutesAfter: args.minutesAfter,
            }),
            includeLeo
                ? this.getLeoDepartures({
                      localStopIds,
                      leoStopIds,
                      leoPlatformIds,
                      totalLimit: args.totalLimit ?? 1_000,
                      minutesBefore: args.minutesBefore,
                      minutesAfter: args.minutesAfter,
                  })
                : Promise.resolve([]),
        ]);
        const limit = args.limit;
        const totalLimit = args.totalLimit ?? 1_000;
        const parsedDepartures = departureSchema
            .array()
            .parse(localDepartures.concat(leoDepartures));
        const limitedByPlatformAndRoute =
            limit !== null && limit < totalLimit
                ? limitDeparturesPerRoute(parsedDepartures, limit)
                : parsedDepartures;

        return limitedByPlatformAndRoute
            .sort(
                (left, right) =>
                    +new Date(left.departure.predicted) -
                    +new Date(right.departure.predicted),
            )
            .slice(0, totalLimit);
    }

    private async classifyPlatformsByFeed(
        platformIds: readonly string[],
    ): Promise<{ pid: string[]; nonPid: string[] }> {
        if (platformIds.length === 0) {
            return { pid: [], nonPid: [] };
        }

        const nonPidPlatformRows = await this.database.db
            .selectFrom("GtfsStopTime")
            .select("platformId")
            .distinct()
            .where("platformId", "in", [...platformIds])
            .where("feedId", "!=", GtfsFeedId.PID)
            .execute();

        const nonPidSet = new Set(
            nonPidPlatformRows.flatMap((row) =>
                row.platformId ? [row.platformId] : [],
            ),
        );

        return {
            pid: platformIds.filter((id) => !nonPidSet.has(id)),
            nonPid: platformIds.filter((id) => nonPidSet.has(id)),
        };
    }

    private async getLocalDepartures(args: {
        stopIds: string[];
        platformIds: string[];
        vehicleType: VehicleTypeSchema;
        excludeVehicleType: VehicleTypeSchema | null;
        totalLimit: number;
        minutesBefore: number;
        minutesAfter: number;
    }): Promise<DepartureSchema[]> {
        const vehicleTypeWhere =
            args.vehicleType === "metro"
                ? { isMetro: true }
                : args.excludeVehicleType === "metro"
                  ? { isMetro: false }
                  : undefined;
        const allPlatformIds =
            await this.departureBoardService.resolvePlatformIds({
                platformIds: args.platformIds,
                stopIds: args.stopIds,
                ...(vehicleTypeWhere?.isMetro !== undefined
                    ? { metroOnly: vehicleTypeWhere.isMetro }
                    : {}),
            });

        if (allPlatformIds.length === 0) {
            return [];
        }

        const { pid: pidPlatformIds, nonPid: nonPidPlatformIds } =
            await this.classifyPlatformsByFeed(allPlatformIds);

        const [realtimeDepartures, gtfsFallbackDepartures] = await Promise.all([
            this.getPidRealtimeDepartures({
                platformIds: pidPlatformIds,
                totalLimit: args.totalLimit,
                minutesBefore: args.minutesBefore,
                minutesAfter: args.minutesAfter,
            }),
            this.getNonPidGtfsFallbackDepartures({
                platformIds: nonPidPlatformIds,
                minutesBefore: args.minutesBefore,
                minutesAfter: args.minutesAfter,
                totalLimit: args.totalLimit,
            }),
        ]);

        return realtimeDepartures.concat(gtfsFallbackDepartures);
    }

    private async getPidRealtimeDepartures(args: {
        platformIds: readonly string[];
        totalLimit: number;
        minutesBefore: number;
        minutesAfter: number;
    }): Promise<DepartureSchema[]> {
        if (args.platformIds.length === 0) {
            return [];
        }

        const departureBoard =
            await this.departureBoardService.fetchDepartureBoard({
                platformIds: args.platformIds,
                params: {
                    limit: args.totalLimit,
                    minutesAfter: args.minutesAfter,
                    minutesBefore: args.minutesBefore,
                    mode: "departures",
                    order: "real",
                    skip: "canceled",
                },
            });
        const routeShortNames = [
            ...new Set(
                departureBoard.departures.map(
                    (departure) => departure.route.short_name,
                ),
            ),
        ];
        const gtfsRoutes =
            routeShortNames.length === 0
                ? []
                : await this.database.db
                      .selectFrom("GtfsRoute")
                      .select(["id", "shortName"])
                      .where("shortName", "in", routeShortNames)
                      .where("feedId", "=", GtfsFeedId.PID)
                      .execute();
        const gtfsRouteIdByShortName = new Map(
            gtfsRoutes.map((route) => [route.shortName, route.id] as const),
        );

        return departureBoard.departures.map((departure) => ({
            id: departure.trip.id,
            departure: departure.departure_timestamp,
            delay: getDelayInSeconds(departure.delay),
            headsign: departure.trip.headsign,
            route: departure.route.short_name,
            routeId:
                gtfsRouteIdByShortName.get(departure.route.short_name) ??
                ROUTE_ID_BY_NAME[
                    departure.route.short_name as keyof typeof ROUTE_ID_BY_NAME
                ] ??
                null,
            platformId: departure.stop.id,
            platformCode: departure.stop.platform_code,
            isRealtime: true,
        }));
    }

    private async getLeoDepartures(args: {
        localStopIds: string[];
        leoStopIds: string[];
        leoPlatformIds: string[];
        totalLimit: number;
        minutesBefore: number;
        minutesAfter: number;
    }): Promise<DepartureSchema[]> {
        const leoStops = await this.leoGtfsService.getStops();
        const leoStopsById = new Map(
            leoStops.map((stop) => [stop.id, stop] as const),
        );
        const matchedLeoStopIdByLocalStopId =
            args.localStopIds.length === 0
                ? new Map<string, string>()
                : await this.leoStopMatcherService.getMatchedLeoStopByLocalStopId(
                      await this.loadLocalStopsByIds(args.localStopIds),
                  );
        const explicitLeoPlatformIds = new Set(args.leoPlatformIds);
        const leoPlatformIdsFromStops = uniqueSortedStrings(
            args.leoStopIds
                .flatMap((stopId) => leoStopsById.get(stopId)?.platforms ?? [])
                .map((platform) => platform.id),
        );
        const matchedLeoPlatformIds = uniqueSortedStrings(
            args.localStopIds
                .flatMap(
                    (stopId) =>
                        leoStopsById.get(
                            matchedLeoStopIdByLocalStopId.get(stopId) ?? "",
                        )?.platforms ?? [],
                )
                .map((platform) => platform.id),
        );
        const leoPlatformIds = uniqueSortedStrings([
            ...explicitLeoPlatformIds,
            ...leoPlatformIdsFromStops,
            ...matchedLeoPlatformIds,
        ]);

        if (leoPlatformIds.length === 0) {
            return [];
        }

        return this.getNonPidGtfsFallbackDepartures({
            platformIds: leoPlatformIds,
            minutesBefore: args.minutesBefore,
            minutesAfter: args.minutesAfter,
            totalLimit: args.totalLimit,
        });
    }

    private async loadLocalStopsByIds(
        ids: readonly string[],
    ): Promise<
        Array<Pick<Stop, "avgLatitude" | "avgLongitude" | "id" | "name">>
    > {
        if (ids.length === 0) {
            return [];
        }

        return this.database.db
            .selectFrom("Stop")
            .select(["id", "name", "avgLatitude", "avgLongitude"])
            .where("id", "in", [...ids])
            .execute();
    }

    private async getNonPidGtfsFallbackDepartures(args: {
        platformIds: readonly string[];
        minutesBefore: number;
        minutesAfter: number;
        totalLimit: number;
    }): Promise<DepartureSchema[]> {
        if (args.platformIds.length === 0) {
            return [];
        }

        if (this.gtfsTimetableFallbackAvailable === false) {
            return [];
        }

        try {
            const fallbackPlatformIds = [...args.platformIds];
            const feedIdRows = await this.database.db
                .selectFrom("GtfsStopTime")
                .select("feedId")
                .distinct()
                .where("platformId", "in", fallbackPlatformIds)
                .where("feedId", "!=", GtfsFeedId.PID)
                .execute();
            const feedIds = uniqueSortedStrings(
                feedIdRows.map((row) => row.feedId),
            );

            if (feedIds.length === 0) {
                this.gtfsTimetableFallbackAvailable = true;

                return [];
            }
            const now = new Date();
            const windowStart = new Date(
                now.getTime() - args.minutesBefore * 60_000,
            );
            const windowEnd = new Date(
                now.getTime() + args.minutesAfter * 60_000,
            );
            const serviceDates = getGtfsServiceDatesForWindow({
                start: windowStart,
                end: windowEnd,
            });
            const activeServiceIdsByFeedDate =
                await this.getActiveGtfsServiceIdsForDates({
                    feedIds,
                    serviceDates,
                });
            const departures = await this.database.db
                .selectFrom("GtfsStopTime")
                .innerJoin("GtfsTrip", (join) =>
                    join
                        .onRef("GtfsTrip.feedId", "=", "GtfsStopTime.feedId")
                        .onRef("GtfsTrip.tripId", "=", "GtfsStopTime.tripId"),
                )
                .innerJoin("GtfsRoute", (join) =>
                    join
                        .onRef("GtfsRoute.feedId", "=", "GtfsTrip.feedId")
                        .onRef("GtfsRoute.id", "=", "GtfsTrip.routeId"),
                )
                .leftJoin("Platform", "Platform.id", "GtfsStopTime.platformId")
                .select([
                    "GtfsStopTime.id as stopTimeId",
                    "GtfsStopTime.feedId as feedId",
                    "GtfsStopTime.tripId as tripId",
                    "GtfsStopTime.stopSequence as stopSequence",
                    "GtfsStopTime.platformId as platformId",
                    "GtfsStopTime.arrivalTime as arrivalTime",
                    "GtfsStopTime.departureTime as departureTime",
                    "GtfsTrip.serviceId as serviceId",
                    "GtfsTrip.routeId as routeId",
                    "GtfsTrip.tripHeadsign as tripHeadsign",
                    "GtfsRoute.shortName as routeShortName",
                    "GtfsRoute.longName as routeLongName",
                    "Platform.code as platformCode",
                ])
                .where("GtfsStopTime.platformId", "in", fallbackPlatformIds)
                .where("GtfsStopTime.feedId", "in", feedIds)
                .execute();
            const tripKeys = uniqueSortedStrings(
                departures.map((row) => `${row.feedId}::${row.tripId}`),
            );
            const frequenciesByTripKey =
                tripKeys.length === 0
                    ? new Map<
                          string,
                          Array<{
                              startTime: string;
                              endTime: string;
                              headwaySecs: number;
                          }>
                      >()
                    : await this.loadGtfsFrequenciesByTripKey({
                          feedIds,
                          tripKeys,
                      });
            const firstStopTimeByTripKey =
                frequenciesByTripKey.size === 0
                    ? new Map<string, number>()
                    : await this.loadGtfsFirstStopTimeByTripKey({
                          feedIds,
                          tripKeys: [...frequenciesByTripKey.keys()],
                      });
            const fallbackDepartures = departures.flatMap((row) => {
                const platformId = row.platformId;
                const serviceId = row.serviceId;

                if (!platformId || !serviceId) {
                    return [];
                }

                const departureTime = row.departureTime ?? row.arrivalTime;

                if (!departureTime) {
                    return [];
                }

                const timeSeconds = parseGtfsTimeToSeconds(departureTime);

                if (timeSeconds === null) {
                    return [];
                }

                const tripKey = `${row.feedId}::${row.tripId}`;
                const frequencies = frequenciesByTripKey.get(tripKey);
                const buildDeparture = (
                    serviceDate: string,
                    actualSeconds: number,
                    suffix: string,
                ): DepartureSchema | null => {
                    const predictedDate = toPragueDateFromGtfs({
                        gtfsDate: serviceDate,
                        timeSeconds: actualSeconds,
                    });
                    const predictedMs = predictedDate.getTime();

                    if (
                        predictedMs < windowStart.getTime() ||
                        predictedMs > windowEnd.getTime()
                    ) {
                        return null;
                    }

                    const timestamp = predictedDate.toISOString();

                    return {
                        id: `${row.stopTimeId}::${serviceDate}::${suffix}`,
                        departure: {
                            predicted: timestamp,
                            scheduled: timestamp,
                        },
                        delay: 0,
                        headsign:
                            row.tripHeadsign ??
                            row.routeLongName ??
                            row.routeShortName,
                        route: row.routeShortName,
                        routeId: row.routeId,
                        platformId,
                        platformCode: row.platformCode,
                        isRealtime: false,
                    } satisfies DepartureSchema;
                };

                return serviceDates.flatMap((serviceDate) => {
                    const activeServiceIds = activeServiceIdsByFeedDate.get(
                        `${row.feedId}::${serviceDate}`,
                    );

                    if (!activeServiceIds?.has(serviceId)) {
                        return [];
                    }

                    if (frequencies && frequencies.length > 0) {
                        const firstStopSeconds =
                            firstStopTimeByTripKey.get(tripKey) ?? 0;
                        const offsetSeconds = timeSeconds - firstStopSeconds;
                        const results: DepartureSchema[] = [];

                        for (const frequency of frequencies) {
                            const startSeconds = parseGtfsTimeToSeconds(
                                frequency.startTime,
                            );
                            const endSeconds = parseGtfsTimeToSeconds(
                                frequency.endTime,
                            );

                            if (
                                startSeconds === null ||
                                endSeconds === null ||
                                frequency.headwaySecs <= 0
                            ) {
                                continue;
                            }

                            for (
                                let tripStartSeconds = startSeconds;
                                tripStartSeconds < endSeconds;
                                tripStartSeconds += frequency.headwaySecs
                            ) {
                                const actualSeconds =
                                    tripStartSeconds + offsetSeconds;
                                const departure = buildDeparture(
                                    serviceDate,
                                    actualSeconds,
                                    `freq::${frequency.startTime}::${tripStartSeconds}`,
                                );

                                if (departure) {
                                    results.push(departure);
                                }
                            }
                        }

                        return results;
                    }

                    const departure = buildDeparture(
                        serviceDate,
                        timeSeconds,
                        "explicit",
                    );

                    return departure ? [departure] : [];
                });
            });

            this.gtfsTimetableFallbackAvailable = true;

            return fallbackDepartures
                .sort(
                    (left, right) =>
                        +new Date(left.departure.predicted) -
                        +new Date(right.departure.predicted),
                )
                .slice(0, args.totalLimit);
        } catch (error) {
            if (this.isMissingGtfsTimetableError(error)) {
                this.gtfsTimetableFallbackAvailable = false;

                return [];
            }

            throw error;
        }
    }

    private async getActiveGtfsServiceIdsForDates(args: {
        feedIds: readonly string[];
        serviceDates: readonly string[];
    }): Promise<Map<string, Set<string>>> {
        const result = new Map<string, Set<string>>();

        for (const feedId of args.feedIds) {
            for (const serviceDate of args.serviceDates) {
                result.set(`${feedId}::${serviceDate}`, new Set());
            }
        }

        if (args.feedIds.length === 0 || args.serviceDates.length === 0) {
            return result;
        }

        const [calendars, calendarDates] = await Promise.all([
            this.database.db
                .selectFrom("GtfsCalendar")
                .select([
                    "feedId",
                    "serviceId",
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                    "startDate",
                    "endDate",
                ])
                .where("feedId", "in", [...args.feedIds] as GtfsFeedId[])
                .execute(),
            this.database.db
                .selectFrom("GtfsCalendarDate")
                .select(["feedId", "serviceId", "date", "exceptionType"])
                .where("feedId", "in", [...args.feedIds] as GtfsFeedId[])
                .where("date", "in", [...args.serviceDates])
                .execute(),
        ]);

        for (const calendar of calendars) {
            for (const serviceDate of args.serviceDates) {
                if (calendar.startDate && serviceDate < calendar.startDate) {
                    continue;
                }

                if (calendar.endDate && serviceDate > calendar.endDate) {
                    continue;
                }

                const dayFlag = getWeekdayFromGtfsDate(serviceDate);

                if (!calendar[dayFlag]) {
                    continue;
                }

                result
                    .get(`${calendar.feedId}::${serviceDate}`)
                    ?.add(calendar.serviceId);
            }
        }

        for (const calendarDate of calendarDates) {
            const key = `${calendarDate.feedId}::${calendarDate.date}`;
            const services = result.get(key);

            if (!services) {
                continue;
            }

            if (calendarDate.exceptionType === 1) {
                services.add(calendarDate.serviceId);
                continue;
            }

            if (calendarDate.exceptionType === 2) {
                services.delete(calendarDate.serviceId);
            }
        }

        return result;
    }

    private async loadGtfsFrequenciesByTripKey(args: {
        feedIds: readonly string[];
        tripKeys: readonly string[];
    }): Promise<
        Map<
            string,
            Array<{
                startTime: string;
                endTime: string;
                headwaySecs: number;
            }>
        >
    > {
        const result = new Map<
            string,
            Array<{
                startTime: string;
                endTime: string;
                headwaySecs: number;
            }>
        >();
        const tripIds = uniqueSortedStrings(
            args.tripKeys.map((key) => key.split("::").slice(1).join("::")),
        );

        if (tripIds.length === 0 || args.feedIds.length === 0) {
            return result;
        }

        const tripKeySet = new Set(args.tripKeys);
        const rows = await this.database.db
            .selectFrom("GtfsFrequency")
            .select(["feedId", "tripId", "startTime", "endTime", "headwaySecs"])
            .where("feedId", "in", [...args.feedIds] as GtfsFeedId[])
            .where("tripId", "in", [...tripIds])
            .execute();

        for (const row of rows) {
            const key = `${row.feedId}::${row.tripId}`;

            if (!tripKeySet.has(key)) {
                continue;
            }

            const list = result.get(key) ?? [];

            list.push({
                startTime: row.startTime,
                endTime: row.endTime,
                headwaySecs: row.headwaySecs,
            });
            result.set(key, list);
        }

        return result;
    }

    private async loadGtfsFirstStopTimeByTripKey(args: {
        feedIds: readonly string[];
        tripKeys: readonly string[];
    }): Promise<Map<string, number>> {
        const result = new Map<string, number>();
        const tripIds = uniqueSortedStrings(
            args.tripKeys.map((key) => key.split("::").slice(1).join("::")),
        );

        if (tripIds.length === 0 || args.feedIds.length === 0) {
            return result;
        }

        const tripKeySet = new Set(args.tripKeys);
        const rows = await this.database.db
            .selectFrom("GtfsStopTime")
            .select([
                "feedId",
                "tripId",
                "stopSequence",
                "arrivalTime",
                "departureTime",
            ])
            .where("feedId", "in", [...args.feedIds] as GtfsFeedId[])
            .where("tripId", "in", [...tripIds])
            .execute();

        const minSeqByTripKey = new Map<string, number>();

        for (const row of rows) {
            const key = `${row.feedId}::${row.tripId}`;

            if (!tripKeySet.has(key)) {
                continue;
            }

            const currentMin = minSeqByTripKey.get(key);

            if (currentMin === undefined || row.stopSequence < currentMin) {
                minSeqByTripKey.set(key, row.stopSequence);

                const time = row.departureTime ?? row.arrivalTime;
                const seconds =
                    time !== null ? parseGtfsTimeToSeconds(time) : null;

                if (seconds !== null) {
                    result.set(key, seconds);
                }
            }
        }

        return result;
    }

    private isMissingGtfsTimetableError(error: unknown): boolean {
        // Only rely on Postgres SQLSTATE codes: 42P01 (undefined_table) and
        // 42703 (undefined_column). Substring matching on error messages was
        // too broad — any error mentioning "column" or "relation" would flip
        // gtfsTimetableFallbackAvailable to false and permanently disable
        // non-PID departures for the process lifetime.
        return (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error.code === "42P01" || error.code === "42703")
        );
    }
}
