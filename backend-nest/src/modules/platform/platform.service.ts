import { Inject, Injectable } from "@nestjs/common";
import { unique } from "radash";
import { PrismaService } from "src/database/prisma.service";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { pidStopsSchema } from "./schema/pid-stops.schema";
import { StopSchema } from "./schema/stop.schema";
import type { BoundingBox } from "../../schema/bounding-box.schema";
import { minMax } from "src/utils/math";
import { Prisma } from "@prisma/client";
import { StopWithDistanceSchema } from "./schema/stop-with-distance.schema";
import { metroLine } from "src/enums/metro.enum";
import { z } from "zod";

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

    async syncStops(): Promise<void> {
        console.log("Syncing stops and routes");
        const stopsSchema = z.object({
            dataFormatVersion: z.literal("3"),
            stopGroups: z
                .object({
                    name: z.string(),
                    node: z.number(),
                    avgLat: z.number(),
                    avgLon: z.number(),
                    stops: z
                        .object({
                            id: z.string(),
                            lat: z.number(),
                            lon: z.number(),
                        })
                        .array(),
                })
                .array(),
        });

        const stopsUrl = new URL("https://data.pid.cz/stops/json/stops.json");
        const stopsRes = await fetch(stopsUrl, { method: "GET" });
        const stopsRaw = await stopsRes.json();
        const stopsParsed = stopsSchema.safeParse(stopsRaw);

        const platformsUrl = new URL(
            "https://data.pid.cz/geodata/Zastavky_WGS84.json",
        );
        const platformsRes = await fetch(platformsUrl, { method: "GET" });
        const platformsRaw = await platformsRes.json();
        const platformsParsed = pidStopsSchema.safeParse(platformsRaw);

        if (platformsParsed.error) {
            console.error(platformsParsed.error.errors);
            return;
        }

        const platforms = platformsParsed.data.features
            .map((stop) => {
                const properties = stop.properties;
                const [longitude, latitude] = stop.geometry.coordinates;

                const routeIDs = properties.routes_id?.split(",") ?? [];
                const routeNames = properties.routes_names?.split(",") ?? [];

                const isMetro = routeNames.some(
                    (routeName) => metroLine.safeParse(routeName).success,
                );

                return {
                    latitude,
                    longitude,
                    id: properties.stop_id,
                    name: properties.stop_name,
                    isMetro,
                    routes: routeIDs.map((id, index) => ({
                        id,
                        name: routeNames[index],
                    })),
                };
            })
            .filter(
                (stop) =>
                    !!stop.latitude &&
                    !!stop.longitude &&
                    !!stop.id &&
                    !!stop.name,
            );

        const routes = unique(
            platforms.flatMap((stop) => stop.routes),
            ({ id }) => id,
        );

        await this.prisma.$transaction(async (transaction) => {
            await transaction.platformsOnRoutes.deleteMany();
            await transaction.platform.deleteMany();
            await transaction.route.deleteMany();
            await transaction.stop.deleteMany();

            const stopIds = stopsParsed.data.stopGroups.map(
                (stop) => `U${stop.node}`,
            );

            // Create stops
            await transaction.stop.createMany({
                data: stopsParsed.data.stopGroups.map((stop) => ({
                    id: `U${stop.node}`,
                    name: stop.name,
                    avgLatitude: stop.avgLat,
                    avgLongitude: stop.avgLon,
                })),
                skipDuplicates: true,
            });

            // Create routes
            await transaction.route.createMany({
                data: routes.map((route) => ({
                    id: route.id,
                    name: route.name,
                })),
            });

            // Create platforms
            await transaction.platform.createMany({
                data: platforms.map((platform) => {
                    const stopId = platform.id.split("Z")[0];
                    return {
                        id: platform.id,
                        name: platform.name,
                        isMetro: platform.isMetro,
                        latitude: platform.latitude,
                        longitude: platform.longitude,
                        stopId: stopIds.includes(stopId) ? stopId : null,
                    };
                }),
            });

            // Create relations
            await transaction.platformsOnRoutes.createMany({
                data: platforms.flatMap((platform) =>
                    platform.routes.map((route) => ({
                        platformId: platform.id,
                        routeId: route.id,
                    })),
                ),
            });
        });

        await this.cacheManager.reset();

        console.log(
            `Synced ${platforms.length} stops and ${routes.length} routes`,
        );
    }
}
