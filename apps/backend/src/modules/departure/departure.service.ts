import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { unique } from "radash";

import { GOLEMIO_API } from "src/constants/golemio.const";
import { departureBoardsSchema } from "src/modules/departure/schema/departure-boards.schema";
import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { getDelayInSeconds } from "src/utils/delay";

@Injectable()
export class DepartureService {
    constructor(private prisma: PrismaService) {}

    async getDepartures(args: {
        stopIds: string[];
        platformIds: string[];
        metroOnly: boolean;
    }): Promise<DepartureSchema[]> {
        const dbPlatforms = (
            await this.prisma.platform.findMany({
                select: { id: true },
                where: {
                    id: { in: args.platformIds },
                    ...(args.metroOnly ? { isMetro: true } : {}),
                },
            })
        ).map((platform) => platform.id);
        const stopPlatforms = (
            await this.prisma.stop.findMany({
                select: {
                    platforms: {
                        select: { id: true },
                        where: { ...(args.metroOnly ? { isMetro: true } : {}) },
                    },
                },
                where: { id: { in: args.stopIds } },
            })
        ).flatMap((stop) => stop.platforms.map((platform) => platform.id));
        const allPlatformIds = unique([...dbPlatforms, ...stopPlatforms]).slice(
            0,
            100,
        );

        const searchParams = new URLSearchParams(
            allPlatformIds
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
                "X-Access-Token": process.env.GOLEMIO_API_KEY ?? "",
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
                "X-Access-Token": process.env.GOLEMIO_API_KEY ?? "",
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
