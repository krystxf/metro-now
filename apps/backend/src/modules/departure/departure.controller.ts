import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
    UseInterceptors,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { QUERY_IDS_COUNT_MAX } from "src/constants/constants";
import { DepartureService } from "src/modules/departure/departure.service";
import {
    departureSchema,
    type DepartureSchema,
} from "src/modules/departure/schema/departure.schema";
import { LogInterceptor } from "src/modules/logger/log.interceptor";
import { toArray } from "src/utils/array.utils";

@ApiTags("departure")
@Controller("departure")
@UseInterceptors(LogInterceptor)
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

        const departures = this.departureService.getDeparturesByPlatform(
            parsed.data,
        );

        return departureSchema.array().parse(departures);
    }
}
