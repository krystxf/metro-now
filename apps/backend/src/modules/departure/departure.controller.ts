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
import { LoggerService } from "src/modules/logger/logger.service";
import { toArray } from "src/utils/array.utils";
import { measureDuration } from "src/utils/measure-duration";

@ApiTags("departure")
@Controller("departure")
export class DepartureController {
    constructor(
        private readonly departureService: DepartureService,
        private readonly logger: LoggerService,
    ) {}

    @Get("/platform")
    async getDeparturesByPlatform(@Query("id") id): Promise<DepartureSchema[]> {
        const platformSchema = z
            .string()
            .array()
            .min(1)
            .max(QUERY_IDS_COUNT_MAX);
        const parsed = platformSchema.safeParse(toArray(id));

        if (!parsed.success) {
            await this.logger.createRestErrorLog("/departure/platform", { id });
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }

        const [departures, duration] = await measureDuration(
            this.departureService.getDeparturesByPlatform(parsed.data),
        );
        await this.logger.createRestLog("/departure/platform", duration);

        return departureSchema.array().parse(departures);
    }
}
