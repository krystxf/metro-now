import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
    UseInterceptors,
    Version,
    VERSION_NEUTRAL,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { QUERY_IDS_COUNT_MAX } from "src/constants/constants";
import { ApiQueries } from "src/decorators/swagger.decorator";
import { EndpointVersion } from "src/enums/endpoint-version";
import { DepartureService } from "src/modules/departure/departure.service";
import {
    departureSchema,
    type DepartureSchema,
} from "src/modules/departure/schema/departure.schema";
import { LogInterceptor } from "src/modules/logger/log.interceptor";
import { metroOnlySchema } from "src/schema/metro-only.schema";
import { metroOnlyQuery } from "src/swagger/query.swagger";
import { toArray } from "src/utils/array.utils";

@ApiTags("departure")
@Controller("departure")
@UseInterceptors(CacheInterceptor, LogInterceptor)
@CacheTTL(4 * 1000)
export class DepartureController {
    constructor(private readonly departureService: DepartureService) {}

    @Get()
    @Version([VERSION_NEUTRAL, EndpointVersion.v1])
    @ApiQueries([
        metroOnlyQuery,
        {
            name: "platform[]",
            description: "Platform IDs",
            type: String,
            isArray: true,
            allowEmptyValue: true,
            required: false,
        },
        {
            name: "stop[]",
            description: "Stop IDs",
            type: String,
            isArray: true,
            allowEmptyValue: true,
            required: false,
        },
    ])
    async getDepartures(@Query() query): Promise<DepartureSchema[]> {
        const schema = z.object({
            metroOnly: metroOnlySchema,
            platform: z.string().array().optional().default([]),
            stop: z.string().array().optional().default([]),
        });
        const parsed = schema.safeParse(query);
        if (!parsed.success) {
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }
        const parsedQuery = parsed.data;

        if (parsedQuery.platform.length + parsedQuery.stop.length === 0) {
            throw new HttpException(
                "At least one platform or stop ID must be provided",
                HttpStatus.BAD_REQUEST,
            );
        }

        const departures = await this.departureService.getDepartures({
            stopIds: parsedQuery.stop,
            platformIds: parsedQuery.platform,
            metroOnly: parsedQuery.metroOnly,
        });

        return departureSchema.array().parse(departures);
    }

    @Get("/platform")
    @Version([VERSION_NEUTRAL, EndpointVersion.v1])
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

        const departures = await this.departureService.getDepartures({
            stopIds: [],
            platformIds: parsed.data,
            metroOnly: false,
        });

        return departureSchema.array().parse(departures);
    }
}
