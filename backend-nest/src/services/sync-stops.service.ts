import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "./prisma.service";
import { unique } from "radash";

@Injectable()
export class SyncStopsService {
    constructor(private prisma: PrismaService) {}

    @Cron("0 5 */2 * *")
    async handleCron() {
        console.log("Syncing stops and routes");

        const stops = await syncStops();
        const routes = unique(
            stops.flatMap((stop) => stop.routes),
            ({ id }) => id,
        );

        await this.prisma.$transaction([
            this.prisma.stopsOnRoutes.deleteMany(),
            this.prisma.stop.deleteMany(),
            this.prisma.route.deleteMany(),
            ...routes.map((route) =>
                this.prisma.route.upsert({
                    where: { id: route.id },
                    create: route,
                    update: { name: route.name },
                }),
            ),
            ...stops.flatMap((stop) => [
                this.prisma.stop.upsert({
                    where: { id: stop.id },
                    create: {
                        id: stop.id,
                        name: stop.name,
                        latitude: stop.latitude,
                        longitude: stop.longitude,
                    },
                    update: {},
                }),
                ...stop.routes.map((route) =>
                    this.prisma.stopsOnRoutes.upsert({
                        where: {
                            stopId_routeId: {
                                stopId: stop.id,
                                routeId: route.id,
                            },
                        },
                        create: {
                            stop: { connect: { id: stop.id } },
                            route: { connect: { id: route.id } },
                        },
                        update: {},
                    }),
                ),
            ]),
        ]);

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
    const data = [];
    const LIMIT = 10_000;

    for (let offset = 0; offset < 30_000; offset += LIMIT) {
        const res = await fetch(
            new URL("https://data.pid.cz/geodata/Zastavky_WGS84.json"),
            {
                method: "GET",
            },
        );

        data.push(...(await res.json()).features);
    }

    const parsed = data
        .map((stop) => {
            const routeIDs = stop.properties.routes_id?.split(",") ?? [];
            const routeNames = stop.properties.routes_names?.split(",") ?? [];

            return {
                latitude: stop.geometry.coordinates[1],
                longitude: stop.geometry.coordinates[0],
                id: stop.properties.stop_id,
                name: stop.properties.stop_name,
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
