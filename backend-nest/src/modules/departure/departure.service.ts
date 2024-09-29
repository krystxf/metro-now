import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { GOLEMIO_API } from "src/constants";
import type { DepartureSchema } from "./schema/departure.schema";
import { departureBoardsSchema } from "./schema/departure-boards.schema";
import { getDelayInSeconds } from "src/utils/delay";
import { PrismaService } from "src/database/prisma.service";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

@Injectable()
export class DepartureService {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager,
    ) {}

    async getDeparturesByPlatform(
        requestedIds: string[],
    ): Promise<DepartureSchema[]> {
        const databasePlatforms = await this.prisma.platform.findMany({
            select: {
                id: true,
            },
            where: {
                id: {
                    in: requestedIds,
                },
            },
        });
        const databaseIDs = databasePlatforms.map((platform) => platform.id);
        const allIdsInDb = requestedIds.every((requestedID) =>
            databaseIDs.includes(requestedID),
        );

        if (!allIdsInDb) {
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }

        const searchParams = new URLSearchParams(
            requestedIds
                .map((id) => ["ids", id])
                .concat([
                    ["skip", "canceled"],
                    ["mode", "departures"],
                    ["order", "real"],
                ]),
        );

        const url = new URL(
            `${GOLEMIO_API}/v2/pid/departureboards?${searchParams.toString()}`,
        );

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-Access-Token": process.env.GOLEMIO_API_KEY,
            },
        });
        if (!res.ok) {
            throw new Error(
                `Failed to fetch departure data: ${res.status} ${res.statusText}`,
            );
        }

        const json = await res.json();
        const parsed = departureBoardsSchema.safeParse(json);

        if (!parsed.success) {
            throw new Error(parsed.error.message);
        }

        const parsedDepartures = parsed.data.departures.map((departure) => {
            return {
                departure: departure.departure_timestamp,
                delay: getDelayInSeconds(departure.delay),
                headsign: departure.trip.headsign,
                route: departure.route.short_name,
                platformId: departure.stop.id,
                platformCode: departure.stop.platform_code,
            };
        });

        return parsedDepartures;
    }
}
