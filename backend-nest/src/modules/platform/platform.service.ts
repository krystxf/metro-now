import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma.service";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { StopSchema } from "./schema/stop.schema";
import type { BoundingBox } from "../../schema/bounding-box.schema";
import { minMax } from "src/utils/math";
import { Prisma } from "@prisma/client";
import { StopWithDistanceSchema } from "./schema/stop-with-distance.schema";

export const platformSelect = {
    id: true,
    latitude: true,
    longitude: true,
    name: true,
    isMetro: true,
    routes: {
        select: {
            route: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
} satisfies Prisma.PlatformSelect;

@Injectable()
export class PlatformService {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager,
    ) {}

    async getClosestStops({
        latitude,
        longitude,
        count,
        metroOnly,
    }: {
        latitude: number;
        longitude: number;
        count: number;
        metroOnly: boolean;
    }): Promise<StopWithDistanceSchema[]> {
        const res = await this.prisma.$transaction(async (transaction) => {
            const platformsWithDistance = await this.prisma.$queryRaw<
                { id: string; distance: number }[]
            >`
                SELECT 
                    "Platform"."id",
                    earth_distance(
                        ll_to_earth("Platform"."latitude", "Platform"."longitude"),
                        ll_to_earth(${latitude}, ${longitude})
                    ) AS "distance"
                FROM "Platform"
                ${metroOnly ? Prisma.sql`WHERE "Platform"."isMetro" = true` : Prisma.empty}
                ORDER BY "distance"
                LIMIT ${count}
            `;

            const distanceByStopID = Object.fromEntries(
                platformsWithDistance.map(({ id, distance }) => [id, distance]),
            );

            const platforms = await transaction.platform.findMany({
                select: platformSelect,
                where: {
                    id: {
                        in: platformsWithDistance.map((stop) => stop.id),
                    },
                },
            });

            return platforms
                .map((stop) => ({
                    ...stop,
                    distance: distanceByStopID[stop.id],
                }))
                .sort((a, b) => a.distance - b.distance);
        });

        return res.map((platform) => ({
            ...platform,
            routes: platform.routes.map(({ route }) => route),
        }));
    }

    async getPlatformsInBoundingBox({
        boundingBox,
        metroOnly,
    }: {
        boundingBox: BoundingBox;
        metroOnly: boolean;
    }): Promise<StopSchema[]> {
        const latitude = minMax(boundingBox.latitude);
        const longitude = minMax(boundingBox.longitude);

        const platforms = await this.prisma.platform.findMany({
            select: platformSelect,
            where: {
                latitude: {
                    gte: latitude.min,
                    lte: latitude.max,
                },
                longitude: {
                    gte: longitude.min,
                    lte: longitude.max,
                },
                isMetro: metroOnly ? true : undefined,
            },
        });

        return platforms.map((platform) => ({
            ...platform,
            routes: platform.routes.map(({ route }) => route),
        }));
    }

    async getAllPlatforms({
        metroOnly,
    }: {
        metroOnly: boolean;
    }): Promise<StopSchema[]> {
        const platforms = await this.prisma.platform.findMany({
            select: platformSelect,
            where: { isMetro: metroOnly ? true : undefined },
        });

        return platforms.map((platform) => ({
            ...platform,
            routes: platform.routes.map(({ route }) => route),
        }));
    }
}
