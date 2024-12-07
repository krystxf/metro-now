import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
    UseInterceptors,
    Version,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { ApiQueries } from "src/decorators/swagger.decorator";
import { EndpointVersion } from "src/enums/endpoint-version";
import { DepartureServiceV1 } from "src/modules/departure/departure-v1.service";
import { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";
import {
    departureSchema,
    type DepartureSchema,
} from "src/modules/departure/schema/departure.schema";
import {
    metroOnlySchema,
    vehicleTypeSchema,
} from "src/schema/metro-only.schema";
import { metroOnlyQuery } from "src/swagger/query.swagger";

@ApiTags("departure")
@Controller("departure")
@UseInterceptors(CacheInterceptor)
@CacheTTL(4 * 1000)
export class DepartureController {
    constructor(
        private readonly departureServiceV1: DepartureServiceV1,
        private readonly departureServiceV2: DepartureServiceV2,
    ) {}

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

    @Get()
    @Version([EndpointVersion.v2])
    @ApiQueries([
        {
            name: "platform[]",
            description: "Platform IDs",
            type: [String],
            example: ["U1040Z101P", "U1040Z102P"],
            allowEmptyValue: true,
            required: false,
        },
        {
            name: "stop[]",
            description: "Stop IDs",
            type: [String],
            example: ["U1040"],
            allowEmptyValue: true,
            required: false,
        },
        {
            name: "vehicleType",
            description: "Vehicle type",
            enum: vehicleTypeSchema.Enum,
            example: vehicleTypeSchema.Enum.all,
            required: false,
            schema: {
                default: vehicleTypeSchema.Enum.all,
            },
        },
        {
            name: "excludeVehicleType",
            description: "Excluded vehicle type",
            enum: vehicleTypeSchema.exclude(["all"]).Enum,
            example: null,
            required: false,
            schema: {
                default: null,
            },
            allowEmptyValue: true,
        },
        {
            name: "minutesBefore",
            description: "Minutes Before",
            type: "integer",
            example: 0,
            required: false,
        },
        {
            name: "minutesAfter",
            description: "Minutes After",
            type: "integer",
            example: 2 * 60,
            required: false,
        },
        {
            name: "limit",
            description: "Limit of results per platform and route",
            type: "integer",
            example: 10,
            required: false,
        },
        {
            name: "totalLimit",
            description: "Limit of total results",
            type: "integer",
            example: 500,
            required: false,
        },
    ])
    async getDeparturesV2(@Query() query): Promise<DepartureSchema[]> {
        const schema = z.object({
            vehicleType: vehicleTypeSchema.default("all"),
            excludeVehicleType: vehicleTypeSchema
                .exclude(["all"])
                .nullable()
                .optional()
                .default(null),
            platform: z.string().array().optional().default([]),
            stop: z.string().array().optional().default([]),
            limit: z.coerce.number().int().optional().nullable().default(null), // limit of results (departures) per platform and route
            totalLimit: z.coerce
                .number()
                .int()
                .optional()
                .nullable()
                .default(null), // total limit of results (departures)
            minutesBefore: z.coerce.number().optional().nullable().default(0),
            minutesAfter: z.coerce.number().optional().nullable().default(null),
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
            vehicleType: parsedQuery.vehicleType,
            excludeVehicleType: parsedQuery.excludeVehicleType,
            limit: parsedQuery.limit ?? null,
            totalLimit: parsedQuery.totalLimit ?? null,
            minutesBefore: parsedQuery.minutesBefore ?? 0,
            minutesAfter: parsedQuery.minutesAfter ?? 2 * 60,
        });

        departureSchema.array().parse(departures);

        return departures;
    }
}
