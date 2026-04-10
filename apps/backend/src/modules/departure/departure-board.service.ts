import { Injectable } from "@nestjs/common";

import { uniqueSortedStrings } from "src/constants/cache";
import { DatabaseService } from "src/modules/database/database.service";
import { departureBoardsSchema } from "src/modules/departure/schema/departure-boards.schema";
import { GolemioService } from "src/modules/golemio/golemio.service";

type DepartureBoardSearchParams = Record<
    string,
    string | number | boolean | null | undefined
>;

@Injectable()
export class DepartureBoardService {
    constructor(
        private readonly database: DatabaseService,
        private readonly golemioService: GolemioService,
    ) {}

    async resolvePlatformIds({
        platformIds,
        stopIds,
        metroOnly,
        limit = 100,
    }: {
        platformIds: readonly string[];
        stopIds: readonly string[];
        metroOnly?: boolean;
        limit?: number;
    }): Promise<string[]> {
        const directPlatforms =
            platformIds.length === 0
                ? []
                : await this.database.db
                      .selectFrom("Platform")
                      .select("id")
                      .where("id", "in", [...platformIds])
                      .$if(metroOnly !== undefined, (query) =>
                          query.where("isMetro", "=", metroOnly!),
                      )
                      .execute();
        const stopPlatforms =
            stopIds.length === 0
                ? []
                : await this.database.db
                      .selectFrom("Platform")
                      .select("id")
                      .where("stopId", "in", [...stopIds])
                      .$if(metroOnly !== undefined, (query) =>
                          query.where("isMetro", "=", metroOnly!),
                      )
                      .execute();

        return uniqueSortedStrings([
            ...directPlatforms.map((platform) => platform.id),
            ...stopPlatforms.map((platform) => platform.id),
        ]).slice(0, limit);
    }

    async fetchDepartureBoard({
        platformIds,
        params,
    }: {
        platformIds: readonly string[];
        params: DepartureBoardSearchParams;
    }) {
        const resolvedPlatformIds = uniqueSortedStrings(platformIds).slice(
            0,
            100,
        );

        if (resolvedPlatformIds.length === 0) {
            return departureBoardsSchema.parse({
                departures: [],
                infotexts: [],
                stops: [],
            });
        }

        const searchParams = new URLSearchParams(
            resolvedPlatformIds
                .map((id) => ["ids", id])
                .concat(
                    Object.entries(params)
                        .filter(
                            ([, value]) =>
                                value !== null && value !== undefined,
                        )
                        .map(([key, value]) => [key, String(value)]),
                ),
        );

        const data = await this.golemioService.getGolemioData(
            `/v2/pid/departureboards?${searchParams.toString()}`,
        );

        return departureBoardsSchema.parse(data);
    }
}
