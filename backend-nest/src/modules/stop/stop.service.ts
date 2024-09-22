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

export const stopSelect = {
    id: true,
    latitude: true,
    longitude: true,
    name: true,
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
} satisfies Prisma.StopSelect;

@Injectable()
export class StopService {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager,
    ) {}

    async getClosestStops({
        latitude,
        longitude,
        count,
    }: {
        latitude: number;
        longitude: number;
        count: number;
    }): Promise<StopWithDistanceSchema[]> {
        const res = await this.prisma.$transaction(async (transaction) => {
            const stopsWithDistance = await this.prisma.$queryRaw<
                { id: string; distance: number }[]
            >`
                SELECT 
                    "Stop"."id",
                    earth_distance(
                        ll_to_earth("Stop"."latitude", "Stop"."longitude"),
                        ll_to_earth(${latitude}, ${longitude})
                    ) AS "distance"
                FROM "Stop"
                ORDER BY "distance"
                LIMIT ${count}
            `;

            const distanceByStopID = Object.fromEntries(
                stopsWithDistance.map(({ id, distance }) => [id, distance]),
            );

            const stops = await transaction.stop.findMany({
                select: stopSelect,
                where: {
                    id: {
                        in: stopsWithDistance.map((stop) => stop.id),
                    },
                },
            });

            return stops
                .map((stop) => ({
                    ...stop,
                    distance: distanceByStopID[stop.id],
                }))
                .sort((a, b) => a.distance - b.distance);
        });

        return res.map((stop) => ({
            ...stop,
            routes: stop.routes.map(({ route }) => route),
        }));
    }

    async getStopsInBoundingBox(
        boundingBox: BoundingBox,
    ): Promise<StopSchema[]> {
        const latitude = minMax(boundingBox.latitude);
        const longitude = minMax(boundingBox.longitude);

        const stops = await this.prisma.stop.findMany({
            select: stopSelect,
            where: {
                latitude: {
                    gte: latitude.min,
                    lte: latitude.max,
                },
                longitude: {
                    gte: longitude.min,
                    lte: longitude.max,
                },
            },
        });

        return stops.map((stop) => ({
            ...stop,
            routes: stop.routes.map(({ route }) => route),
        }));
    }

    async getAllStops(): Promise<StopSchema[]> {
        const stops = await this.prisma.stop.findMany({
            select: stopSelect,
        });

        return stops.map((stop) => ({
            ...stop,
            routes: stop.routes.map(({ route }) => route),
        }));
    }

    async syncStops(): Promise<void> {
        console.log("Syncing stops and routes");

        const url = new URL("https://data.pid.cz/geodata/Zastavky_WGS84.json");
        const res = await fetch(url, { method: "GET" });
        const raw = await res.json();
        const parsed = pidStopsSchema.safeParse(raw);

        if (parsed.error) {
            console.error(parsed.error.errors);
            return;
        }

        const stops = parsed.data.features
            .map((stop) => {
                const properties = stop.properties;
                const [longitude, latitude] = stop.geometry.coordinates;

                const routeIDs = properties.routes_id?.split(",") ?? [];
                const routeNames = properties.routes_names?.split(",") ?? [];

                return {
                    latitude,
                    longitude,
                    id: properties.stop_id,
                    name: properties.stop_name,
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
            stops.flatMap((stop) => stop.routes),
            ({ id }) => id,
        );

        await this.prisma.$transaction(async (transaction) => {
            await transaction.stopsOnRoutes.deleteMany();
            await transaction.stop.deleteMany();
            await transaction.route.deleteMany();

            // Create routes
            await transaction.route.createMany({
                data: routes.map((route) => ({
                    id: route.id,
                    name: route.name,
                })),
            });

            // Create stops
            await transaction.stop.createMany({
                data: stops.map((stop) => ({
                    id: stop.id,
                    name: stop.name,
                    latitude: stop.latitude,
                    longitude: stop.longitude,
                })),
            });

            // Create relations
            await transaction.stopsOnRoutes.createMany({
                data: stops.flatMap((stop) =>
                    stop.routes.map((route) => ({
                        stopId: stop.id,
                        routeId: route.id,
                    })),
                ),
            });
        });

        await this.cacheManager.reset();

        console.log(`Synced ${stops.length} stops and ${routes.length} routes`);
    }
}
