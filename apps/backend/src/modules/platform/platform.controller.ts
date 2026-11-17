import { CacheInterceptor } from "@nestjs/cache-manager";
import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
    UseInterceptors,
    Version,
} from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { Either, Schema } from "effect";
import { coerceNumber, integer } from "src/schema/coercion";

import { ApiDescription, ApiQueries } from "src/decorators/swagger.decorator";
import { EndpointVersion } from "src/enums/endpoint-version";
import { PlatformService } from "src/modules/platform/platform.service";
import {
    type PlatformWithDistanceSchema,
    platformWithDistanceSchema,
} from "src/modules/platform/schema/platform-with-distance.schema";
import {
    type PlatformSchema,
    platformSchema,
} from "src/modules/platform/schema/platform.schema";
import { boundingBoxSchema } from "src/schema/bounding-box.schema";
import { metroOnlySchema } from "src/schema/metro-only.schema";
import {
    boundingBoxQuery,
    latitudeQuery,
    longitudeQuery,
    metroOnlyQuery,
} from "src/swagger/query.swagger";

@ApiTags("platform")
@Controller("platform")
@UseInterceptors(CacheInterceptor)
export class PlatformController {
    constructor(private readonly platformService: PlatformService) {}

    @Get("/all")
    @Version([EndpointVersion.v1])
    @ApiDescription({
        summary: "List of all platforms",
    })
    @ApiQuery(metroOnlyQuery)
    async getAllPlatformsV1(@Query() query): Promise<PlatformSchema[]> {
        const schema = Schema.mutable(
            Schema.Struct({ metroOnly: metroOnlySchema }),
        );
        const parsed = Schema.decodeUnknownEither(schema)(query);
        if (Either.isLeft(parsed)) {
            throw new HttpException(
                parsed.left.message,
                HttpStatus.BAD_REQUEST,
            );
        }

        const platforms = await this.platformService.getAll(parsed.right);

        return Schema.decodeUnknownSync(
            Schema.mutable(Schema.Array(platformSchema)),
        )(platforms);
    }

    @Get("/closest")
    @Version([EndpointVersion.v1])
    @ApiDescription({
        description: `
⚠️ _For better privacy consider using \`/in-box\`_


Sort platforms by distance to a given location. Location may be saved in logs. 
`,
        summary: "List of platforms sorted by distance to a given location",
    })
    @ApiQueries([
        metroOnlyQuery,
        latitudeQuery,
        longitudeQuery,
        {
            name: "count",
            type: Number,
            required: false,
            example: 100,
            description: "number of platforms to return, default is `0` (all)",
        },
    ])
    async getPlatformsByDistanceV1(
        @Query() query,
    ): Promise<PlatformWithDistanceSchema[]> {
        const schema = Schema.mutable(
            Schema.Struct({
                latitude: coerceNumber,
                longitude: coerceNumber,
                count: Schema.optionalWith(
                    coerceNumber.pipe(integer).pipe(Schema.nonNegative()),
                    { default: () => 0 },
                ),
                metroOnly: metroOnlySchema,
            }),
        );

        const parsed = Schema.decodeUnknownEither(schema)(query);

        if (Either.isLeft(parsed)) {
            throw new HttpException(
                parsed.left.message,
                HttpStatus.BAD_REQUEST,
            );
        }

        const platforms = await this.platformService.getPlatformsByDistance(
            parsed.right,
        );

        return Schema.decodeUnknownSync(
            Schema.mutable(Schema.Array(platformWithDistanceSchema)),
        )(platforms);
    }

    @Get("/in-box")
    @Version([EndpointVersion.v1])
    @ApiDescription({
        summary: "List of platforms within a given bounding box",
    })
    @ApiQueries([metroOnlyQuery, ...boundingBoxQuery])
    async getPlatformsInBoundingBoxV1(
        @Query() query,
    ): Promise<PlatformSchema[]> {
        const schema = Schema.mutable(
            Schema.Struct({
                boundingBox: boundingBoxSchema,
                metroOnly: metroOnlySchema,
            }),
        );
        const parsed = Schema.decodeUnknownEither(schema)({
            boundingBox: {
                latitude: query?.latitude,
                longitude: query?.longitude,
            },
            metroOnly: query?.metroOnly,
        });

        if (Either.isLeft(parsed)) {
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }

        const platforms = await this.platformService.getPlatformsInBoundingBox(
            parsed.right,
        );

        return Schema.decodeUnknownSync(
            Schema.mutable(Schema.Array(platformSchema)),
        )(platforms);
    }
}
