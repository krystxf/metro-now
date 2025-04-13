import { Injectable } from "@nestjs/common";
import { Open as unzipperOpen } from "unzipper";

import { PrismaService } from "src/modules/prisma/prisma.service";
import { parseCsvString } from "src/utils/csv.utils";

@Injectable()
export class GtfsService {
    constructor(private readonly prisma: PrismaService) {}

    async syncGtfsData() {
        const response = await fetch("https://data.pid.cz/PID_GTFS.zip");
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const directory = await unzipperOpen.buffer(buffer);

        const routes = directory.files.find(
            (file) => file.path === "routes.txt",
        );
        if (!routes) {
            console.log("routes.txt not found");
            return;
        }
        const routeStops = directory.files.find(
            (file) => file.path === "route_stops.txt",
        );
        if (!routeStops) {
            console.log("route_stops.txt not found");
            return;
        }

        const routesBuffer = await routes.buffer();
        const routeStopsBuffer = await routeStops.buffer();

        type RouteRecord = {
            route_id: string;
            route_short_name: string;
            route_long_name: string;
            route_type: string;
            route_color?: string | undefined;
            is_night: string;
            route_url?: string | undefined;
        };
        // FIXME: validate with zod
        const routesData = await parseCsvString<RouteRecord>(
            routesBuffer.toString(),
        );

        type RouteStopRecord = {
            route_id: string;
            direction_id: string;
            stop_id: string;
            stop_sequence: string;
        };
        // FIXME: validate with zod
        const routeStopsData = await parseCsvString<RouteStopRecord>(
            routeStopsBuffer.toString(),
        );

        await this.prisma.$transaction(async (transaction) => {
            await transaction.gtfsRouteStop.deleteMany();
            await transaction.gtfsRoute.deleteMany();

            await transaction.gtfsRoute.createMany({
                data: routesData.map((route) => ({
                    id: route.route_id,
                    shortName: route.route_short_name,
                    longName: route.route_long_name ?? null,
                    type: route.route_type,
                    isNight: Boolean(route.is_night),
                    color: route.route_color ?? null,
                    url: route.route_url ?? null,
                })),
            });

            const platforms = await this.prisma.platform.findMany({
                select: { id: true },
            });
            const platformIds = platforms.map((platform) => platform.id);

            await transaction.gtfsRouteStop.createMany({
                data: routeStopsData
                    .map((routeStop) => {
                        let stopId = routeStop.stop_id;

                        if (stopId.includes("_")) {
                            stopId = stopId.split("_")[0];
                        }

                        return {
                            routeId: routeStop.route_id,
                            directionId: routeStop.direction_id,
                            stopId: stopId,
                            stopSequence: Number(routeStop.stop_sequence),
                        };
                    })
                    .filter((routeStop) =>
                        platformIds.includes(routeStop.stopId),
                    ),
            });
        });

        console.log("Finished GTFS sync");
    }
}
