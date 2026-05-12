import {
    parseGtfsTimeToSeconds,
    toPragueDateFromGtfs,
} from "src/modules/departure/prague-gtfs-time.utils";
import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";

export type GtfsDepartureRow = {
    stopTimeId: string;
    feedId: string;
    tripId: string;
    platformId: string | null;
    arrivalTime: string | null;
    departureTime: string | null;
    serviceId: string | null;
    routeId: string;
    tripHeadsign: string | null;
    routeShortName: string;
    routeLongName: string | null;
    platformCode: string | null;
};

export type GtfsFrequency = {
    startTime: string;
    endTime: string;
    headwaySecs: number;
};

function buildSingleDeparture(
    row: GtfsDepartureRow,
    args: {
        serviceDate: string;
        actualSeconds: number;
        suffix: string;
        windowStart: Date;
        windowEnd: Date;
    },
): DepartureSchema | null {
    const predictedDate = toPragueDateFromGtfs({
        gtfsDate: args.serviceDate,
        timeSeconds: args.actualSeconds,
    });
    const predictedMs = predictedDate.getTime();

    if (
        predictedMs < args.windowStart.getTime() ||
        predictedMs > args.windowEnd.getTime()
    ) {
        return null;
    }

    const timestamp = predictedDate.toISOString();

    return {
        id: `${row.stopTimeId}::${args.serviceDate}::${args.suffix}`,
        departure: {
            predicted: timestamp,
            scheduled: timestamp,
        },
        delay: 0,
        headsign: row.tripHeadsign ?? row.routeLongName ?? row.routeShortName,
        route: row.routeShortName,
        routeId: row.routeId,
        platformId: row.platformId as string,
        platformCode: row.platformCode,
        isRealtime: false,
    } satisfies DepartureSchema;
}

export function buildGtfsFallbackDepartures(args: {
    rows: GtfsDepartureRow[];
    frequenciesByTripKey: Map<string, GtfsFrequency[]>;
    firstStopTimeByTripKey: Map<string, number>;
    activeServiceIdsByFeedDate: Map<string, Set<string>>;
    serviceDates: readonly string[];
    windowStart: Date;
    windowEnd: Date;
    totalLimit: number;
}): DepartureSchema[] {
    const {
        rows,
        frequenciesByTripKey,
        firstStopTimeByTripKey,
        activeServiceIdsByFeedDate,
        serviceDates,
        windowStart,
        windowEnd,
        totalLimit,
    } = args;

    const fallbackDepartures = rows.flatMap((row) => {
        const { platformId, serviceId } = row;

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
                        const actualSeconds = tripStartSeconds + offsetSeconds;
                        const departure = buildSingleDeparture(row, {
                            serviceDate,
                            actualSeconds,
                            suffix: `freq::${frequency.startTime}::${tripStartSeconds}`,
                            windowStart,
                            windowEnd,
                        });

                        if (departure) {
                            results.push(departure);
                        }
                    }
                }

                return results;
            }

            const departure = buildSingleDeparture(row, {
                serviceDate,
                actualSeconds: timeSeconds,
                suffix: "explicit",
                windowStart,
                windowEnd,
            });

            return departure ? [departure] : [];
        });
    });

    return fallbackDepartures
        .sort(
            (left, right) =>
                +new Date(left.departure.predicted) -
                +new Date(right.departure.predicted),
        )
        .slice(0, totalLimit);
}
