import { Controller, Get, HttpException, Query } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { DepartureService } from "./departure.service";
import { toArray } from "src/utils/array.utils";
import { z } from "zod";
import {
    departureSchema,
    type DepartureSchema,
} from "./schema/departure.schema";

@Controller("departure")
export class DepartureController {
    constructor(
        private prisma: PrismaService,
        private readonly departureService: DepartureService,
    ) {}

    @Get("/platform")
    async getDeparturesByPlatform(
        @Query("platform") platform,
    ): Promise<DepartureSchema[]> {
        const platformSchema = z.string().array().min(1).max(20);
        const parsed = platformSchema.safeParse(toArray(platform));

        if (!parsed.success) {
            throw new HttpException("Invalid query params", 400);
        }

        const departures = await this.departureService.getDeparturesByPlatform(
            parsed.data,
        );

        return departureSchema.array().parse(departures);
    }
}
