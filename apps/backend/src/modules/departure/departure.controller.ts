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
import { Either, Schema } from "effect";
import { coerceNumber } from "src/schema/coercion";

import { ApiQueries } from "src/decorators/swagger.decorator";
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
        const schema = Schema.mutable(
            Schema.Struct({
                metroOnly: metroOnlySchema,
                platform: Schema.optionalWith(
                    Schema.mutable(Schema.Array(Schema.String)),
                    { default: () => [] },
                ),
                stop: Schema.optionalWith(
                    Schema.mutable(Schema.Array(Schema.String)),
                    { default: () => [] },
                ),
            }),
        );
        const parsed = Schema.decodeUnknownEither(schema)(query);
        if (Either.isLeft(parsed)) {
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }
        const parsedQuery = parsed.right;

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

        return Schema.decodeUnknownSync(
            Schema.mutable(Schema.Array(departureSchema)),
        )(departures);
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
            enum: ["metro", "all"],
            example: "all",
            required: false,
            schema: {
                default: "all",
            },
        },
        {
            name: "excludeVehicleType",
            description: "Excluded vehicle type",
            enum: ["metro"],
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
        const schema = Schema.mutable(
            Schema.Struct({
                vehicleType: Schema.optionalWith(vehicleTypeSchema, {
                    default: () => "all",
                }),
                excludeVehicleType: Schema.optionalWith(
                    Schema.NullOr(
                        vehicleTypeSchema.pipe(Schema.pickLiteral("metro")),
                    ),
                    { default: () => null },
                ),
                platform: Schema.optionalWith(
                    Schema.mutable(Schema.Array(Schema.String)),
                    { default: () => [] },
                ),
                stop: Schema.optionalWith(
                    Schema.mutable(Schema.Array(Schema.String)),
                    { default: () => [] },
                ),
                limit: Schema.optionalWith(
                    Schema.NullOr(coerceNumber.pipe(Schema.int())),
                    { default: () => null },
                ),
                totalLimit: Schema.optionalWith(
                    Schema.NullOr(coerceNumber.pipe(Schema.int())),
                    { default: () => null },
                ),
                minutesBefore: Schema.optionalWith(
                    Schema.NullOr(coerceNumber),
                    { default: () => 0 },
                ),
                minutesAfter: Schema.optionalWith(Schema.NullOr(coerceNumber), {
                    default: () => null,
                }),
            }),
        );
        const parsed = Schema.decodeUnknownEither(schema)(query);
        if (Either.isLeft(parsed)) {
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }
        const parsedQuery = parsed.right;

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

        Schema.decodeUnknownSync(Schema.mutable(Schema.Array(departureSchema)))(
            departures,
        );

        return departures;
    }
}
