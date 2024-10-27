import { Injectable } from "@nestjs/common";
import { VehicleType } from "@prisma/client";
import { unique } from "radash";

import { LogLevel, LogMessage, StopSyncTrigger } from "src/enums/log.enum";
import {
    pidStopsSchema,
    type PidStopsSchema,
} from "src/modules/import/schema/pid-stops.schema";
import { LoggerService } from "src/modules/logger/logger.service";
import { PrismaService } from "src/modules/prisma/prisma.service";

@Injectable()
export class ImportService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: LoggerService,
    ) {}

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
                vehicleType: string;
            }[];
        }[];
    }): Promise<void> {
        const uniqueStops = unique(stops, (stop) => stop.id);
        const uniqueRoutes = unique(
            platforms.flatMap((platform) => platform.routes),
            (route) => route.id,
        );

        await this.prisma.$transaction(
            async (transaction) => {
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
                    data: unique(
                        platforms.map((platform) => {
                            const stopIdExists =
                                platform.stopId !== null &&
                                stops.some(
                                    (stop) => stop.id === platform.stopId,
                                );

                            return {
                                id: platform.id,
                                name: platform.name,
                                isMetro: platform.isMetro,
                                latitude: platform.latitude,
                                longitude: platform.longitude,
                                stopId: stopIdExists ? platform.stopId : null,
                            };
                        }),
                        (platform) => platform.id,
                    ),
                });

                // Create routes
                await transaction.route.createMany({
                    data: uniqueRoutes.map((route) => ({
                        id: route.id,
                        name: route.name,
                        vehicleType:
                            VehicleType?.[route.vehicleType.toUpperCase()] ??
                            null,
                    })),
                });

                // Create relations
                await transaction.platformsOnRoutes.createMany({
                    data: unique(
                        platforms.flatMap((platform) =>
                            platform.routes.map((route) => ({
                                platformId: platform.id,
                                routeId: route.id,
                            })),
                        ),
                        (relation) =>
                            `${relation.platformId}${relation.routeId}`,
                    ),
                });
            },
            {
                maxWait: 10 * 1_000,
                timeout: 20 * 60 * 1_000,
            },
        );
    }

    async syncStops(trigger: StopSyncTrigger): Promise<void> {
        const start = Date.now();

        try {
            const stopsData = await this.getStops();

            const platforms = stopsData.stopGroups
                .flatMap((stop) =>
                    stop.stops.map((platform) => {
                        return {
                            latitude: platform.lat,
                            longitude: platform.lon,
                            id: platform.gtfsIds?.[0],
                            name: platform.altIdosName,
                            isMetro: platform.isMetro === true,
                            routes: platform.lines.map((line) => ({
                                id: line.id,
                                name: line.name,
                                vehicleType: line.type,
                            })),
                        };
                    }),
                )
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

            await this.logger.createLog(LogLevel.log, LogMessage.IMPORT_STOPS, {
                trigger,
                duration: Date.now() - start,
                stops: stopsData.stopGroups.length,
                platforms: platforms.length,
            });
        } catch (error) {
            console.error(error);
            await this.logger.createLog(
                LogLevel.error,
                LogMessage.IMPORT_STOPS,
                {
                    trigger,
                    duration: Date.now() - start,
                    error: JSON.stringify(error),
                },
            );
        } finally {
            console.log("Finished stop sync");
        }
    }
}
