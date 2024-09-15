import {
    Controller,
    Get,
    HttpException,
    OnModuleInit,
    Query,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CacheTTL } from "@nestjs/cache-manager";
import { StopService } from "./stop.service";
import { stopSchema, type StopSchema } from "./schema/stop.schema";
import { Cron } from "@nestjs/schedule";
import { boundingBoxSchema } from "../../schema/bounding-box.schema";

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

    @Cron("0 3 */2 * *")
    async syncStops(): Promise<void> {
        await this.stopService.syncStops();
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
