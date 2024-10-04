import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
} from "@nestjs/common";
import { DepartureService } from "./departure.service";
import { toArray } from "src/utils/array.utils";
import { z } from "zod";
import {
    departureSchema,
    type DepartureSchema,
} from "./schema/departure.schema";
import { CacheTTL } from "@nestjs/cache-manager";
import { QUERY_IDS_COUNT_MAX } from "src/constants/constants";
import { ApiTags } from "@nestjs/swagger";

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
