import * as csv from "@fast-csv/parse";
import { CACHE_MANAGER, CacheInterceptor } from "@nestjs/cache-manager";
import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Param,
    Query,
    UseInterceptors,
    Version,
    VERSION_NEUTRAL,
} from "@nestjs/common";
import { ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Cache } from "cache-manager";
import { Open as unzipperOpen } from "unzipper";

import { ApiDescription } from "src/decorators/swagger.decorator";
import { EndpointVersion } from "src/enums/endpoint-version";
import { LogInterceptor } from "src/modules/logger/log.interceptor";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { StopService } from "src/modules/stop/stop.service";
import { metroOnlyQuery } from "src/swagger/query.swagger";

@ApiTags("stop")
@Controller("stop")
// @UseInterceptors(CacheInterceptor, LogInterceptor)
export class StopController {
    constructor(
        private readonly stopService: StopService,
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

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

        if (!stopsRaw) {
            throw new HttpException(
                "stops.txt not found",
                HttpStatus.NOT_FOUND,
            );
        }
        if (!routesRaw) {
            throw new HttpException(
                "routes.txt not found",
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

        const parsedStops = await parseCsvStops();
        const parsedRoutes = await parseCsvRoutes();

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
                await transaction.platformsOnRoutes.deleteMany({
                    where: { datasetName },
                });
                await transaction.platform.deleteMany({
                    where: { datasetName },
                });
                await transaction.stop.deleteMany({ where: { datasetName } });
                await transaction.route.deleteMany({ where: { datasetName } });

                await transaction.route.createMany({
                    data: parsedRoutes.map((route) => ({
                        id: route.route_id,
                        name: route.route_short_name,
                        isNight: route.is_night === "1",
                        datasetName,
                    })),
                });

                await transaction.stop.createMany({
                    data: stopsWithPlatforms.map((stop) => ({
                        id: stop.stop_id,
                        name: stop.stop_name,
                        avgLatitude: stop.stop_lat,
                        avgLongitude: stop.stop_lon,
                        datasetName,
                    })),
                });

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

    @Get("get/brno")
    @Version([EndpointVersion.v1])
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

    @Get("get/prague")
    @Version([EndpointVersion.v1])
    async getPrague() {
        console.log("Prague: Getting data");
        const dataURL = "http://data.pid.cz/PID_GTFS.zip";

        await this.syncDataToRedis(dataURL);
        console.log("Prague: Synced data to Redis");

        await this.syncToDatabase(dataURL, "PRAGUE");
        console.log("Prague: Synced data to database");

        return;
    }

    @Get("/all")
    @Version([VERSION_NEUTRAL])
    @ApiQuery(metroOnlyQuery)
    @ApiDescription({
        deprecated: true,
    })
    async getAllStops(
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ) {
        const metroOnly: boolean = metroOnlyQuery === "true";

        return this.stopService.getAll({ metroOnly });
    }

    @Get("/all")
    @Version([EndpointVersion.v1])
    @ApiQuery(metroOnlyQuery)
    async getAllStopsV1(
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ) {
        const metroOnly: boolean = metroOnlyQuery === "true";

        return this.stopService.getAll({ metroOnly });
    }

    @Get(":id")
    @Version([EndpointVersion.v1])
    @ApiParam({
        name: "id",
        description: "Stop ID",
        required: true,
        example: "U1040",
        type: "string",
    })
    async getStopByIdV1(@Param("id") id: string) {
        if (!id) {
            throw new HttpException("Missing stop ID", HttpStatus.BAD_REQUEST);
        }

        const res = await this.stopService.getStopById(id);

        if (!res) {
            throw new HttpException("Stop ID not found", HttpStatus.NOT_FOUND);
        }

        return res;
    }
}
