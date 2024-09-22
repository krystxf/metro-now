import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    OnModuleInit,
    Query,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CacheTTL } from "@nestjs/cache-manager";
import { StopService } from "./stop.service";
import { stopSchema, type StopSchema } from "./schema/stop.schema";
import { Cron, CronExpression } from "@nestjs/schedule";
import { boundingBoxSchema } from "../../schema/bounding-box.schema";
import { z } from "zod";
import {
    stopWithDistanceSchema,
    StopWithDistanceSchema,
} from "./schema/stop-with-distance.schema";

@CacheTTL(0)
@Controller("stop")
export class StopController implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private readonly stopService: StopService,
    ) {}

    async onModuleInit() {
        await this.stopService.syncStops();
    }

    @Cron(CronExpression.EVERY_7_HOURS)
    async syncStops(): Promise<void> {
        await this.stopService.syncStops();
    }

    @Get("/closest")
    async getClosestStops(
        @Query("latitude")
        latitudeQuery: unknown,
        @Query("longitude")
        longitudeQuery: unknown,
        @Query("count")
        countQuery: unknown,
    ): Promise<StopWithDistanceSchema[]> {
        const schema = z.object({
            latitude: z.coerce.number(),
            longitude: z.coerce.number(),
            count: z.coerce.number().int().positive().max(100).default(20),
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
        const stops = await this.stopService.getClosestStops({
            latitude,
            longitude,
            count,
        });

        return stopWithDistanceSchema.array().parse(stops);
    }

    @Get("/all")
    async getAllStops(): Promise<StopSchema[]> {
        const stops = await this.stopService.getAllStops();

        return stopSchema.array().parse(stops);
    }

    @Get("/in-box")
    async getStops(
        @Query("latitude")
        latitude: unknown,
        @Query("longitude")
        longitude: unknown,
    ): Promise<StopSchema[]> {
        const parsed = boundingBoxSchema.safeParse({
            latitude,
            longitude,
        });

        if (!parsed.success) {
            throw new HttpException("Invalid query params", 400);
        }

        const stops = await this.stopService.getStopsInBoundingBox(parsed.data);

        return stopSchema.array().parse(stops);
    }
}
