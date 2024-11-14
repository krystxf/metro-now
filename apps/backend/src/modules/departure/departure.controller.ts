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
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { QUERY_IDS_COUNT_MAX } from "src/constants/constants";
import { ApiDescription, ApiQueries } from "src/decorators/swagger.decorator";
import { EndpointVersion } from "src/enums/endpoint-version";
import { DepartureServiceV1 } from "src/modules/departure/departure-v1.service";
import { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";
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
    constructor(
        private readonly departureServiceV1: DepartureServiceV1,
        private readonly departureServiceV2: DepartureServiceV2,
    ) {}

    @Get()
    @Version([VERSION_NEUTRAL])
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
    @ApiOperation({
        deprecated: true,
    })
    @ApiDescription({
        deprecated: true,
    })
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

        const departures = await this.departureServiceV1.getDepartures({
            stopIds: parsedQuery.stop,
            platformIds: parsedQuery.platform,
            metroOnly: parsedQuery.metroOnly,
        });

        return departureSchema.array().parse(departures);
    }

    @Get()
    @Version([EndpointVersion.v1])
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
    async getDeparturesV1(@Query() query): Promise<DepartureSchema[]> {
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

        const departures = await this.departureServiceV1.getDepartures({
            stopIds: parsedQuery.stop,
            platformIds: parsedQuery.platform,
            metroOnly: parsedQuery.metroOnly,
        });

        return departureSchema.array().parse(departures);
    }

    @Get("/platform")
    @Version([VERSION_NEUTRAL, EndpointVersion.v1])
    @ApiDescription({
        deprecated: true,
    })
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

        const departures = await this.departureServiceV1.getDepartures({
            stopIds: [],
            platformIds: parsed.data,
            metroOnly: false,
        });

        return departureSchema.array().parse(departures);
    }

    @Get()
    @Version([EndpointVersion.v2])
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
    async getDeparturesV2(@Query() query): Promise<DepartureSchema[]> {
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

        const departures = await this.departureServiceV2.getDepartures({
            stopIds: parsedQuery.stop,
            platformIds: parsedQuery.platform,
            metroOnly: parsedQuery.metroOnly,
        });

        return departureSchema.array().parse(departures);
    }
}
