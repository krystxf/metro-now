import { Inject, Injectable } from "@nestjs/common";
import { unique } from "radash";
import { PrismaService } from "src/database/prisma.service";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { pidStopsSchema } from "./schema/pid-stops.schema";
import { StopSchema } from "./schema/stop.schema";
import type { BoundingBox } from "../../schema/bounding-box.schema";
import { minMax } from "src/utils/math";
import type { Prisma } from "@prisma/client";

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

        const res = await fetch(
            new URL("https://data.pid.cz/geodata/Zastavky_WGS84.json"),
            {
                method: "GET",
            },
        );
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
