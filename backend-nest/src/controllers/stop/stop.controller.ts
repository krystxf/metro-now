import { Controller, Get, HttpException, Query } from "@nestjs/common";
import { PrismaService } from "../../services/prisma.service";
import z from "zod";
import { minMax } from "src/utils/math";
import { parseQueryParam } from "src/utils/query-params";
import { stopSelect } from "./stop.utils";
import { CacheTTL } from "@nestjs/cache-manager";

@CacheTTL(0)
@Controller("stop")
export class StopController {
    constructor(private prisma: PrismaService) {}

    @Get()
    async getStops(
        @Query("latitude") latitudes: string[],
        @Query("longitude") longitudes: string[],
    ) {
        const parsedParams = {
            latitudes: parseQueryParam(latitudes),
            longitudes: parseQueryParam(longitudes),
        };

        const schema = z.number().array().length(2);
        const parsedValues = {
            latitudes: schema.safeParse(parsedParams.latitudes),
            longitudes: schema.safeParse(parsedParams.longitudes),
        };

        if (!parsedValues.latitudes.success) {
            throw new HttpException(
                "Invalid latitude: " +
                    JSON.stringify(parsedValues.latitudes.error.errors),
                400,
            );
        }

        if (!parsedValues.longitudes.success) {
            throw new HttpException(
                "Invalid longitude: " + parsedValues.longitudes.error,
                400,
            );
        }

        const latitude = minMax(parsedValues.latitudes.data);
        const longitude = minMax(parsedValues.longitudes.data);

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

    @Get("all")
    async getAllStops() {
        const stops = await this.prisma.stop.findMany({
            select: stopSelect,
        });

        return stops.map((stop) => ({
            ...stop,
            routes: stop.routes.map(({ route }) => route),
        }));
    }
}
