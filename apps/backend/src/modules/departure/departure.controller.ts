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
import { z } from "zod";

import { EndpointVersion } from "src/enums/endpoint-version";
import { DepartureServiceV1 } from "src/modules/departure/departure-v1.service";
import { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";
import {
    type DepartureSchema,
    departureSchema,
} from "src/modules/departure/schema/departure.schema";
import {
    metroOnlySchema,
    vehicleTypeSchema,
} from "src/schema/metro-only.schema";

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
