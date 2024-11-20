import { CACHE_MANAGER } from "@nestjs/cache-manager";
import {
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    OnModuleInit,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Cache } from "cache-manager";

import { Environment } from "src/enums/environment.enum";
import { StopSyncTrigger } from "src/enums/log.enum";
import { ImportService } from "src/modules/import/import.service";
import { PrismaService } from "src/modules/prisma/prisma.service";
import * as csv from "@fast-csv/parse";
import { Open as unzipperOpen } from "unzipper";

@Controller("import")
export class ImportController implements OnModuleInit {
    constructor(
        private readonly importService: ImportService,
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    async onModuleInit(): Promise<void> {
        // return;

        const importPromise = this.importService.syncStops(
            StopSyncTrigger.INIT,
        );

        const dataURL =
            "https://www.arcgis.com/sharing/rest/content/items/379d2e9a7907460c8ca7fda1f3e84328/data";
        await this.syncDataToRedis(dataURL);
        await this.syncToDatabase(dataURL, "BRNO");

        if (process.env.NODE_ENV === Environment.TEST) {
            // await importPromise;
        }
    }

    @Cron(CronExpression.EVERY_7_HOURS)
    async cronSyncStops(): Promise<void> {
        return;

        return this.importService.syncStops(StopSyncTrigger.CRON);
    }

    async syncDataToRedis(dataURL: string) {
        const response = await fetch(dataURL);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const directory = await unzipperOpen.buffer(buffer);

        for (const file of directory.files) {
            const fileBuffer = await file.buffer();

            await this.cacheManager.set(
                `${dataURL}/${file.path}`,
                fileBuffer.toString(),
                0,
            );
        }
    }

    async syncToDatabase(dataURL: string, datasetName: string) {
        const stopsRaw = await this.cacheManager.get(`${dataURL}/stops.txt`);
        const routesRaw = await this.cacheManager.get(`${dataURL}/routes.txt`);
        const tripsRaw = await this.cacheManager.get(`${dataURL}/trips.txt`);

        if (!stopsRaw || !routesRaw || !tripsRaw) {
            throw new HttpException(
                "stops.txt not found",
                HttpStatus.NOT_FOUND,
            );
        }

        const parseCsvStops = () => {
            return new Promise<any[]>((resolve) => {
                const data: any[] = [];

                csv.parseString(String(stopsRaw), { headers: true })
                    .on("error", (error) => console.error(error))
                    .on("data", (row) => {
                        if (!row || !row.stop_name) return;

                        data.push({
                            ...row,
                            stop_lat: Number(row.stop_lat),
                            stop_lon: Number(row.stop_lon),
                        });
                    })
                    .on("end", () => {
                        resolve(data);
                    });
            });
        };
        const parseCsvRoutes = () => {
            return new Promise<any[]>((resolve) => {
                const data: any[] = [];

                csv.parseString(String(routesRaw), { headers: true })
                    .on("error", (error) => console.error(error))
                    .on("data", (row) => {
                        if (!row || !row.route_id || !row.route_short_name)
                            return;

                        data.push(row);
                    })
                    .on("end", () => {
                        resolve(data);
                    });
            });
        };
        const parseCsvTrips = () => {
            return new Promise<any[]>((resolve) => {
                const data: any[] = [];

                csv.parseString(String(tripsRaw), { headers: true })
                    .on("error", (error) => console.error(error))
                    .on("data", (row) => {
                        if (
                            !row ||
                            !row.route_id ||
                            !row.trip_id ||
                            !row.trip_headsign
                        )
                            return;

                        data.push(row);
                    })
                    .on("end", () => {
                        resolve(data);
                    });
            });
        };

        const parsedStops = await parseCsvStops();
        const parsedRoutes = await parseCsvRoutes();
        const parsedTrips = await parseCsvTrips();

        const stopsWithPlatforms = parsedStops
            .map((stop) => ({
                ...stop,
                platforms: parsedStops.filter(
                    (s) => s.parent_station === stop.stop_id,
                ),
            }))
            .filter((stop) => stop.platforms.length);

        await this.prisma.dataset.upsert({
            create: { name: datasetName },
            update: {},
            where: { name: datasetName },
        });

        await this.prisma.$transaction(
            async (transaction) => {
                await transaction.trip.deleteMany({ where: { datasetName } });
                await transaction.platformsOnRoutes.deleteMany({
                    where: { datasetName },
                });
                await transaction.platform.deleteMany({
                    where: { datasetName },
                });
                await transaction.stop.deleteMany({ where: { datasetName } });
                await transaction.route.deleteMany({ where: { datasetName } });

                console.log("Syncing routes");
                await transaction.route.createMany({
                    data: parsedRoutes.map((route) => ({
                        id: route.route_id,
                        name: route.route_short_name,
                        isNight: route.is_night === "1",
                        datasetName,
                    })),
                });

                console.log("Syncing trips");
                await transaction.trip.createMany({
                    data: parsedTrips.map((trip) => ({
                        id: trip.trip_id,
                        headsign: trip.trip_headsign,
                        routeId: trip.route_id,
                        datasetName,
                    })),
                });

                console.log("Syncing stops");
                await transaction.stop.createMany({
                    data: stopsWithPlatforms.map((stop) => ({
                        id: stop.stop_id,
                        name: stop.stop_name,
                        avgLatitude: stop.stop_lat,
                        avgLongitude: stop.stop_lon,
                        datasetName,
                    })),
                });

                console.log("Syncing platforms");
                await transaction.platform.createMany({
                    data: stopsWithPlatforms.flatMap((stop) =>
                        stop.platforms.map((platform) => ({
                            id: platform.stop_id,
                            name: platform.stop_name,
                            code: platform.platform_code,
                            latitude: platform.stop_lat,
                            longitude: platform.stop_lon,
                            stopId: stop.stop_id,
                            isMetro: false,
                            datasetName,
                        })),
                    ),
                });
            },
            {
                timeout: 1000 * 60 * 5,
            },
        );
    }

    async getBrno() {
        console.log("Brno: Getting data");
        const dataURL =
            "https://www.arcgis.com/sharing/rest/content/items/379d2e9a7907460c8ca7fda1f3e84328/data";

        await this.syncDataToRedis(dataURL);
        console.log("Brno: Synced data to Redis");

        await this.syncToDatabase(dataURL, "BRNO");
        console.log("Brno: Synced data to database");

        return;
    }

    async getPrague() {
        console.log("Prague: Getting data");
        const dataURL = "http://data.pid.cz/PID_GTFS.zip";

        await this.syncDataToRedis(dataURL);
        console.log("Prague: Synced data to Redis");

        await this.syncToDatabase(dataURL, "PRAGUE");
        console.log("Prague: Synced data to database");

        return;
    }
}
