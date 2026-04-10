import { type Stop, GtfsFeedId } from "@metro-now/database";
import { Injectable } from "@nestjs/common";
import { group } from "radash";

import { uniqueSortedStrings } from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import { DepartureBoardService } from "src/modules/departure/departure-board.service";
import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";
import { departureSchema } from "src/modules/departure/schema/departure.schema";
import { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import {
    isLeoPlatformId,
    isLeoStopId,
} from "src/modules/leo/leo-id.utils";
import { LeoStopMatcherService } from "src/modules/leo/leo-stop-matcher.service";
import type { VehicleTypeSchema } from "src/schema/metro-only.schema";
import { getDelayInSeconds } from "src/utils/delay";

const PRAGUE_TIME_ZONE = "Europe/Prague";
const ROUTE_ID_BY_NAME = {
    A: "L991",
    B: "L992",
    C: "L993",
} as const;

type PragueDateTimeParts = {
    date: string;
    time: string;
};

type PragueDateTuple = {
    year: number;
    month: number;
    day: number;
};

const getPragueDateTimeParts = (date: Date): PragueDateTimeParts => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: PRAGUE_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const values = Object.fromEntries(
        formatter
            .formatToParts(date)
            .flatMap((part) =>
                part.type !== "literal" ? [[part.type, part.value]] : [],
            ),
    );

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}:${values.second}`,
    };
};

const parsePragueDate = (value: string): PragueDateTuple => {
    const [year, month, day] = value.split("-").map((part) => Number(part));

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    ) {
        throw new Error(`Invalid Prague date '${value}'`);
    }

    return { year, month, day };
};

const formatGtfsDate = ({ year, month, day }: PragueDateTuple): string =>
    `${String(year).padStart(4, "0")}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;

const parseGtfsDate = (value: string): PragueDateTuple => {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);

    if (!match) {
        throw new Error(`Invalid GTFS date '${value}'`);
    }

    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
    };
};

const addDays = (date: PragueDateTuple, dayDelta: number): PragueDateTuple => {
    const next = new Date(
        Date.UTC(date.year, date.month - 1, date.day + dayDelta, 12, 0, 0),
    );

    return {
        year: next.getUTCFullYear(),
        month: next.getUTCMonth() + 1,
        day: next.getUTCDate(),
    };
};

const parseGtfsTimeToSeconds = (value: string): number | null => {
    const trimmed = value.trim();
    const match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(trimmed);

    if (!match) {
        return null;
    }

    return (
        Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
    );
};

const parseTimezoneOffsetMs = (offset: string): number => {
    const match = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(offset);

    if (!match) {
        return 0;
    }

    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? "0");

    return sign * (hours * 60 + minutes) * 60_000;
};

const getTimezoneOffsetMs = (date: Date, timeZone: string): number => {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "shortOffset",
        year: "numeric",
    });
    const part = formatter
        .formatToParts(date)
        .find((item) => item.type === "timeZoneName")?.value;

    return parseTimezoneOffsetMs(part ?? "GMT+0");
};

const toPragueDateFromGtfs = ({
    gtfsDate,
    timeSeconds,
}: {
    gtfsDate: string;
    timeSeconds: number;
}): Date => {
    const date = parseGtfsDate(gtfsDate);
    const hours = Math.floor(timeSeconds / 3600);
    const minutes = Math.floor((timeSeconds % 3600) / 60);
    const seconds = timeSeconds % 60;
    const localMillis = Date.UTC(
        date.year,
        date.month - 1,
        date.day,
        hours,
        minutes,
        seconds,
    );
    let utcGuess = localMillis;

    for (let index = 0; index < 3; index += 1) {
        const offsetMs = getTimezoneOffsetMs(new Date(utcGuess), PRAGUE_TIME_ZONE);
        const candidate = localMillis - offsetMs;

        if (candidate === utcGuess) {
            break;
        }

        utcGuess = candidate;
    }

    return new Date(utcGuess);
};

const getGtfsServiceDatesForWindow = ({
    start,
    end,
}: {
    start: Date;
    end: Date;
}): string[] => {
    const startDate = parsePragueDate(getPragueDateTimeParts(start).date);
    const endDate = parsePragueDate(getPragueDateTimeParts(end).date);
    const dates: string[] = [];
    let cursor = addDays(startDate, -1);
    const endPlusOne = addDays(endDate, 1);

    while (
        Date.UTC(cursor.year, cursor.month - 1, cursor.day) <=
        Date.UTC(endPlusOne.year, endPlusOne.month - 1, endPlusOne.day)
    ) {
        dates.push(formatGtfsDate(cursor));
        cursor = addDays(cursor, 1);
    }

    return dates;
};

const getWeekdayFromGtfsDate = (
    gtfsDate: string,
):
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday" => {
    const date = parseGtfsDate(gtfsDate);
    const dayOfWeek = new Date(
        Date.UTC(date.year, date.month - 1, date.day),
    ).getUTCDay();

    switch (dayOfWeek) {
        case 0:
            return "sunday";
        case 1:
            return "monday";
        case 2:
            return "tuesday";
        case 3:
            return "wednesday";
        case 4:
            return "thursday";
        case 5:
            return "friday";
        default:
            return "saturday";
    }
};

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
        const localStopIds = args.stopIds.filter((stopId) => !isLeoStopId(stopId));
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
                ? getLimitedRes(parsedDepartures, limit)
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
        const leoStopsById = new Map(leoStops.map((stop) => [stop.id, stop] as const));
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
                .flatMap((stopId) =>
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

    private async loadLocalStopsByIds(ids: readonly string[]): Promise<
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
            const windowEnd = new Date(now.getTime() + args.minutesAfter * 60_000);
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

                return serviceDates.flatMap((serviceDate) => {
                    const activeServiceIds = activeServiceIdsByFeedDate.get(
                        `${row.feedId}::${serviceDate}`,
                    );

                    if (!activeServiceIds?.has(serviceId)) {
                        return [];
                    }

                    const predictedDate = toPragueDateFromGtfs({
                        gtfsDate: serviceDate,
                        timeSeconds,
                    });
                    const predictedMs = predictedDate.getTime();

                    if (
                        predictedMs < windowStart.getTime() ||
                        predictedMs > windowEnd.getTime()
                    ) {
                        return [];
                    }

                    const timestamp = predictedDate.toISOString();

                    return [
                        {
                            id: `${row.stopTimeId}::${serviceDate}`,
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
                        } satisfies DepartureSchema,
                    ];
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

    private isMissingGtfsTimetableError(error: unknown): boolean {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error.code === "42P01" || error.code === "42703")
        ) {
            return true;
        }

        if (
            error instanceof Error &&
            (error.message.includes("does not exist") ||
                error.message.includes("column") ||
                error.message.includes("relation"))
        ) {
            return true;
        }

        return false;
    }
}

const getLimitedRes = (
    departures: DepartureSchema[],
    limit: number,
): DepartureSchema[] => {
    const groupedDepartures = group(
        departures,
        (departure) => `${departure.platformCode}-${departure.route}`,
    );
    const groupedDeparturesValues = Object.values(groupedDepartures);

    return groupedDeparturesValues.flatMap((grouped) =>
        (grouped ?? []).slice(0, limit),
    );
};

