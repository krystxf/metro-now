import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
} from "@nestjs/common";
import { CacheTTL } from "@nestjs/cache-manager";
import { PlatformService } from "./platform.service";
import { stopSchema, type StopSchema } from "./schema/stop.schema";
import { boundingBoxSchema } from "../../schema/bounding-box.schema";
import { z } from "zod";
import {
    stopWithDistanceSchema,
    StopWithDistanceSchema,
} from "./schema/stop-with-distance.schema";

@CacheTTL(0)
@Controller("platform")
export class PlatformController {
    constructor(private readonly platformService: PlatformService) {}

    @Get("/all")
    async getAllStops(
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ): Promise<StopSchema[]> {
        const metroOnly: boolean = metroOnlyQuery === "true";
        const stops = await this.platformService.getAllPlatforms({ metroOnly });

        return stopSchema.array().parse(stops);
    }

    @Get("/closest")
    async getClosestStops(
        @Query("latitude")
        latitudeQuery: unknown,
        @Query("longitude")
        longitudeQuery: unknown,
        @Query("count")
        countQuery: unknown,
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ): Promise<StopWithDistanceSchema[]> {
        const metroOnly: boolean = metroOnlyQuery === "true";
        const schema = z.object({
            latitude: z.coerce.number(),
            longitude: z.coerce.number(),
            count: z.coerce.number().int().positive().min(1).default(20),
        });

        const parsed = schema.safeParse({
            latitude: latitudeQuery,
            longitude: longitudeQuery,
            count: countQuery,
        });

        if (!parsed.success) {
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }

        const { latitude, longitude, count } = parsed.data;
        const stops = await this.platformService.getClosestStops({
            latitude,
            longitude,
            count,
            metroOnly,
        });

        return stopWithDistanceSchema.array().parse(stops);
    }

    @Get("/in-box")
    async getStops(
        @Query("latitude")
        latitude: unknown,
        @Query("longitude")
        longitude: unknown,
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ): Promise<StopSchema[]> {
        const metroOnly: boolean = metroOnlyQuery === "true";

        const parsed = boundingBoxSchema.safeParse({
            latitude,
            longitude,
        });

        if (!parsed.success) {
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }

        const stops = await this.platformService.getPlatformsInBoundingBox({
            boundingBox: parsed.data,
            metroOnly,
        });

        return stopSchema.array().parse(stops);
    }
}
