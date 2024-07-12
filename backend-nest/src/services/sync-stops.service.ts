import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "./prisma.service";
import { unique } from "radash";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

@Injectable()
export class SyncStopsService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager,
    ) {}

    onModuleInit() {
        this.handleCron();
    }

    @Cron("0 3 */2 * *")
    async handleCron() {
        console.log("Syncing stops and routes");

        const stops = await syncStops();
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

const syncStops = async (): Promise<
    {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
        routes: { id: string; name: string }[];
    }[]
> => {
    const res = await fetch(
        new URL("https://data.pid.cz/geodata/Zastavky_WGS84.json"),
        {
            method: "GET",
        },
    );
    const data = (await res.json()).features;

    const parsed = data
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
                !!stop.latitude && !!stop.longitude && !!stop.id && !!stop.name,
        );

    return parsed;
};
