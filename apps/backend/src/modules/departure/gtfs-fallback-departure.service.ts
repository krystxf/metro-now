import { GtfsFeedId } from "@metro-now/database";
import { Injectable, Logger } from "@nestjs/common";

import { uniqueSortedStrings } from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import { buildGtfsFallbackDepartures } from "src/modules/departure/departure-gtfs-fallback.utils";
import {
    getActiveGtfsServiceIdsForDates,
    isMissingGtfsTimetableError,
    loadGtfsFirstStopTimeByTripKey,
    loadGtfsFrequenciesByTripKey,
} from "src/modules/departure/departure-gtfs-timetable.utils";
import { getGtfsServiceDatesForWindow } from "src/modules/departure/prague-gtfs-time.utils";
import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";

@Injectable()
export class GtfsFallbackDepartureService {
    private readonly logger = new Logger(GtfsFallbackDepartureService.name);
    private fallbackAvailable: boolean | undefined;

    constructor(private readonly database: DatabaseService) {}

    async loadDepartures(args: {
        platformIds: readonly string[];
        minutesBefore: number;
        minutesAfter: number;
        totalLimit: number;
    }): Promise<DepartureSchema[]> {
        if (args.platformIds.length === 0) {
            return [];
        }

        if (this.fallbackAvailable === false) {
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
                this.fallbackAvailable = true;

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
                await getActiveGtfsServiceIdsForDates(this.database.db, {
                    feedIds,
                    serviceDates,
                });
            const rows = await this.database.db
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
                rows.map((row) => `${row.feedId}::${row.tripId}`),
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
                    : await loadGtfsFrequenciesByTripKey(this.database.db, {
                          feedIds,
                          tripKeys,
                      });
            const firstStopTimeByTripKey =
                frequenciesByTripKey.size === 0
                    ? new Map<string, number>()
                    : await loadGtfsFirstStopTimeByTripKey(this.database.db, {
                          feedIds,
                          tripKeys: [...frequenciesByTripKey.keys()],
                      });

            this.fallbackAvailable = true;

            return buildGtfsFallbackDepartures({
                rows,
                frequenciesByTripKey,
                firstStopTimeByTripKey,
                activeServiceIdsByFeedDate,
                serviceDates,
                windowStart,
                windowEnd,
                totalLimit: args.totalLimit,
            });
        } catch (error) {
            if (isMissingGtfsTimetableError(error)) {
                this.fallbackAvailable = false;
                this.logger.warn(
                    `GTFS timetable fallback disabled: missing table/column. platformIds=${args.platformIds.join(",")} error=${error instanceof Error ? error.message : String(error)}`,
                );

                return [];
            }

            throw error;
        }
    }
}
