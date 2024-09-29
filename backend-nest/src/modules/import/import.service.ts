import { Inject, Injectable } from "@nestjs/common";
import { unique } from "radash";
import { PrismaService } from "src/database/prisma.service";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
    pidPlatformsSchema,
    type PidPlatformsSchema,
} from "./schema/pid-platforms.schema";
import { pidStopsSchema, type PidStopsSchema } from "./schema/pid-stops.schema";
import { metroLine } from "src/enums/metro.enum";

@Injectable()
export class ImportService {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager,
    ) {}

    async getPlatforms(): Promise<PidPlatformsSchema> {
        const url = new URL("https://data.pid.cz/geodata/Zastavky_WGS84.json");
        const res = await fetch(url, {
            method: "GET",
        });
        if (!res.ok) {
            throw new Error(
                `Failed to fetch platforms data: ${res.status} ${res.statusText}`,
            );
        }
        const raw = await res.json();
        const parsed = pidPlatformsSchema.safeParse(raw);

        if (parsed.error) {
            throw new Error(
                `Couldn't parse data from '${url.toString()}': ${parsed.error}`,
            );
        }
        return parsed.data;
    }

    async getStops(): Promise<PidStopsSchema> {
        const url = new URL("https://data.pid.cz/stops/json/stops.json");
        const res = await fetch(url, { method: "GET" });
        if (!res.ok) {
            throw new Error(
                `Failed to fetch stops data: ${res.status} ${res.statusText}`,
            );
        }
        const raw = await res.json();
        const parsed = pidStopsSchema.safeParse(raw);

        if (parsed.error) {
            throw new Error(
                `Couldn't parse data from '${url.toString()}': ${parsed.error}`,
            );
        }

        return parsed.data;
    }

    async updateDB({
        stops,
        platforms,
    }: {
        stops: {
            id: string;
            name: string;
            avgLatitude: number;
            avgLongitude: number;
        }[];
        platforms: {
            id: string;
            name: string;
            isMetro: boolean;
            latitude: number;
            longitude: number;
            stopId: string | null;
            routes: {
                id: string;
                name: string;
            }[];
        }[];
    }): Promise<void> {
        const uniqueStops = unique(stops, (stop) => stop.id);
        const uniqueRoutes = unique(
            platforms.flatMap((platform) => platform.routes),
            (route) => route.id,
        );

        await this.prisma.$transaction(async (transaction) => {
            await transaction.platformsOnRoutes.deleteMany();
            await transaction.platform.deleteMany();
            await transaction.route.deleteMany();
            await transaction.stop.deleteMany();

            // Create stops
            await transaction.stop.createMany({
                data: uniqueStops.map((stop) => ({
                    id: stop.id,
                    name: stop.name,
                    avgLatitude: stop.avgLatitude,
                    avgLongitude: stop.avgLongitude,
                })),
            });

            await transaction.platform.createMany({
                data: platforms.map((platform) => {
                    const stopIdExists =
                        platform.stopId !== null &&
                        stops.some((stop) => stop.id === platform.stopId);

                    return {
                        id: platform.id,
                        name: platform.name,
                        isMetro: platform.isMetro,
                        latitude: platform.latitude,
                        longitude: platform.longitude,
                        stopId: stopIdExists ? platform.stopId : null,
                    };
                }),
            });

            // Create routes
            await transaction.route.createMany({
                data: uniqueRoutes.map((route) => ({
                    id: route.id,
                    name: route.name,
                })),
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
    }

    async syncStops(): Promise<void> {
        console.log("Syncing stops and routes");

        const platformsData = await this.getPlatforms();
        const stopsData = await this.getStops();

        const platforms = platformsData.features
            .map((stop) => {
                const properties = stop.properties;
                const [longitude, latitude] = stop.geometry.coordinates;

                const routeIDs = properties.routes_id?.split(",") ?? [];
                const routeNames = properties?.routes_names?.split(",") ?? [];

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

        await this.updateDB({
            stops: stopsData.stopGroups.map((stop) => ({
                id: `U${stop.node}`,
                name: stop.name,
                avgLatitude: stop.avgLat,
                avgLongitude: stop.avgLon,
            })),
            platforms: platforms.map((platform) => ({
                id: platform.id,
                name: platform.name,
                isMetro: platform.isMetro,
                latitude: platform.latitude,
                longitude: platform.longitude,
                stopId: platform.id.split("Z")[0],
                routes: platform.routes,
            })),
        });

        // await this.prisma.$transaction(async (transaction) => {
        //     const stopIds = stopsData.stopGroups.map((stop) => `U${stop.node}`);

        //     // Create stops
        //     // await transaction.stop.createMany({
        //     //     data: stopsData.stopGroups.map((stop) => ({
        //     //         id: `U${stop.node}`,
        //     //         name: stop.name,
        //     //         avgLatitude: stop.avgLat,
        //     //         avgLongitude: stop.avgLon,
        //     //     })),
        //     //     skipDuplicates: true,
        //     // });

        //     // Create routes
        //     await transaction.route.createMany({
        //         data: routes.map((route) => ({
        //             id: route.id,
        //             name: route.name,
        //         })),
        //     });

        //     // Create platforms
        //     await transaction.platform.createMany({
        //         data: platforms.map((platform) => {
        //             const stopId = platform.id.split("Z")[0];
        //             return {
        //                 id: platform.id,
        //                 name: platform.name,
        //                 isMetro: platform.isMetro,
        //                 latitude: platform.latitude,
        //                 longitude: platform.longitude,
        //                 stopId: stopIds.includes(stopId) ? stopId : null,
        //             };
        //         }),
        //     });

        //     // Create relations
        //     await transaction.platformsOnRoutes.createMany({
        //         data: platforms.flatMap((platform) =>
        //             platform.routes.map((route) => ({
        //                 platformId: platform.id,
        //                 routeId: route.id,
        //             })),
        //         ),
        //     });
        // });

        await this.cacheManager.reset();

        console.log(`Import finished`);
    }
}
