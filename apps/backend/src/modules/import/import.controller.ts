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
import { Dataset } from "src/enums/dataset.enum";

import { Environment } from "src/enums/environment.enum";
import { StopSyncTrigger } from "src/enums/log.enum";
import { ImportService } from "src/modules/import/import.service";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { parseCsvContents } from "src/utils/csv.utils";
import { unzipResponse } from "src/utils/unzip-response.utils";

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
        this.syncToDatabase(dataURL, Dataset.BRNO);

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
        const directory = await unzipResponse(response);
        const filesToCache = [
            "stops.txt",
            "routes.txt",
            "trips.txt",
            "stop_times.txt",
        ];

        for (const file of directory.files) {
            if (!filesToCache.includes(file.path)) continue;

            const fileBuffer = await file.buffer();

            await this.cacheManager.set(
                `${dataURL}/${file.path}`,
                fileBuffer.toString(),
                0,
            );
        }
    }

    async syncToDatabase(dataURL: string, datasetName: Dataset) {
        const stopsRaw = await this.cacheManager.get(`${dataURL}/stops.txt`);
        const routesRaw = await this.cacheManager.get(`${dataURL}/routes.txt`);
        const tripsRaw = await this.cacheManager.get(`${dataURL}/trips.txt`);
        const stopTimesRaw = await this.cacheManager.get(
            `${dataURL}/stop_times.txt`,
        );

        if (!stopsRaw || !routesRaw || !tripsRaw || !stopTimesRaw) {
            throw new HttpException(
                "GTFS files not found",
                HttpStatus.NOT_FOUND,
            );
        }

        const parsedStops = await parseCsvContents<any>(String(stopsRaw));
        const parsedRoutes = await parseCsvContents<any>(String(routesRaw));
        const parsedTrips = await parseCsvContents<any>(String(tripsRaw));
        const parsedStopTimes = await parseCsvContents<any>(
            String(stopTimesRaw),
        );

        await this.prisma.dataset.upsert({
            create: { name: datasetName },
            update: {},
            where: { name: datasetName },
        });

        await this.prisma.$transaction(
            async (transaction) => {
                await transaction.stopTime.deleteMany({
                    where: { datasetName },
                });
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
                    data: parsedStops.map((stop) => ({
                        id: stop.stop_id,
                        name: stop.stop_name,
                        avgLatitude: Number(stop.stop_lat),
                        avgLongitude: Number(stop.stop_lon),
                        datasetName,
                    })),
                });

                console.log("Syncing stop times");
                await transaction.stopTime.createMany({
                    data: parsedStopTimes.map((stopTime) => ({
                        departureTime: stopTime.departure_time,
                        arrivalTime: stopTime.arrival_time,
                        tripId: stopTime.trip_id,
                        stopId: stopTime.stop_id,
                        datasetName,
                    })),
                });
            },
            {
                timeout: 1000 * 60 * 5,
            },
        );
    }
}
