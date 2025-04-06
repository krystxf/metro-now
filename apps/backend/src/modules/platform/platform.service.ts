import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PlatformWithDistanceSchema } from "src/modules/platform/schema/platform-with-distance.schema";
import { PlatformSchema } from "src/modules/platform/schema/platform.schema";
import { PrismaService } from "src/modules/prisma/prisma.service";
import type { BoundingBox } from "src/schema/bounding-box.schema";
import { minMax } from "src/utils/math";

export const platformSelect = {
    id: true,
    latitude: true,
    longitude: true,
    name: true,
    isMetro: true,
    code: true,
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
    constructor(private prisma: PrismaService) {}

    async getPlatformsByDistance({
        latitude,
        longitude,
        count,
        metroOnly,
    }: {
        latitude: number;
        longitude: number;
        count: number;
        metroOnly: boolean;
    }): Promise<PlatformWithDistanceSchema[]> {
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
                ${count ? Prisma.sql`LIMIT ${count}` : Prisma.empty}
            `;

            const distanceByPlatformID = Object.fromEntries(
                platformsWithDistance.map(({ id, distance }) => [id, distance]),
            );

            const platforms = await transaction.platform.findMany({
                select: platformSelect,
                where: {
                    id: {
                        in: platformsWithDistance.map(
                            (platform) => platform.id,
                        ),
                    },
                },
            });

            return platforms
                .map((platform) => ({
                    ...platform,
                    distance: distanceByPlatformID[platform.id],
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
    }): Promise<PlatformSchema[]> {
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
                ...(metroOnly ? { isMetro: true } : {}),
            },
        });

        return platforms.map((platform) => ({
            ...platform,
            routes: platform.routes.map(({ route }) => route),
        }));
    }

    async getAll({
        metroOnly,
        where,
    }: {
        metroOnly: boolean;
        where?: Prisma.PlatformWhereInput;
    }): Promise<PlatformSchema[]> {
        const platforms = await this.prisma.platform.findMany({
            select: platformSelect,
            where: {
                ...where,
                ...(metroOnly
                    ? {
                          isMetro: true,
                      }
                    : {}),
            },
        });

        return platforms.map((platform) => ({
            ...platform,
            routes: platform.routes.map(({ route }) => route),
        }));
    }

    async getOne(id: string): Promise<PlatformSchema | null> {
        const platform = await this.prisma.platform.findUnique({
            select: platformSelect,
            where: { id },
        });

        if (!platform) {
            return null;
        }

        return {
            ...platform,
            routes: platform.routes.map(({ route }) => route),
        };
    }
}
