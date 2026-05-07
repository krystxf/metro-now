import { type DatabaseClient, GtfsFeedId } from "@metro-now/database";

import { uniqueSortedStrings } from "src/constants/cache";

import {
    getWeekdayFromGtfsDate,
    parseGtfsTimeToSeconds,
} from "./prague-gtfs-time.utils";

export function isMissingGtfsTimetableError(error: unknown): boolean {
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

export async function getActiveGtfsServiceIdsForDates(
    db: DatabaseClient,
    args: {
        feedIds: readonly string[];
        serviceDates: readonly string[];
    },
): Promise<Map<string, Set<string>>> {
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
        db
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
        db
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

export async function loadGtfsFrequenciesByTripKey(
    db: DatabaseClient,
    args: {
        feedIds: readonly string[];
        tripKeys: readonly string[];
    },
): Promise<
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
    const rows = await db
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

export async function loadGtfsFirstStopTimeByTripKey(
    db: DatabaseClient,
    args: {
        feedIds: readonly string[];
        tripKeys: readonly string[];
    },
): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const tripIds = uniqueSortedStrings(
        args.tripKeys.map((key) => key.split("::").slice(1).join("::")),
    );

    if (tripIds.length === 0 || args.feedIds.length === 0) {
        return result;
    }

    const tripKeySet = new Set(args.tripKeys);
    const rows = await db
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
            const seconds = time !== null ? parseGtfsTimeToSeconds(time) : null;

            if (seconds !== null) {
                result.set(key, seconds);
            }
        }
    }

    return result;
}
