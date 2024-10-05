import { CacheTTL } from "@nestjs/cache-manager";
import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { QUERY_IDS_COUNT_MAX } from "src/constants/constants";
import { DepartureService } from "src/modules/departure/departure.service";
import {
    departureSchema,
    type DepartureSchema,
} from "src/modules/departure/schema/departure.schema";
import { toArray } from "src/utils/array.utils";

@CacheTTL(5)
@ApiTags("departure")
@Controller("departure")
export class DepartureController {
    constructor(private readonly departureService: DepartureService) {}

    @Get("/platform")
    async getDeparturesByPlatform(@Query("id") id): Promise<DepartureSchema[]> {
        const platformSchema = z
            .string()
            .array()
            .min(1)
            .max(QUERY_IDS_COUNT_MAX);
        const parsed = platformSchema.safeParse(toArray(id));

        if (!parsed.success) {
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }

        const departures = await this.departureService.getDeparturesByPlatform(
            parsed.data,
        );

        return departureSchema.array().parse(departures);
    }
}
