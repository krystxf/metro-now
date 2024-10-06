import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Query,
} from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { ApiDescription, ApiQueries } from "src/decorators/swagger.decorator";
import { PlatformService } from "src/modules/platform/platform.service";
import {
    platformWithDistanceSchema,
    PlatformWithDistanceSchema,
} from "src/modules/platform/schema/platform-with-distance.schema";
import {
    platformSchema,
    type PlatformSchema,
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
export class PlatformController {
    constructor(private readonly platformService: PlatformService) {}

    @Get("/all")
    @ApiDescription({
        summary: "List of all platforms",
    })
    @ApiQuery(metroOnlyQuery)
    async getAllPlatforms(@Query() query): Promise<PlatformSchema[]> {
        const schema = z.object({
            metroOnly: metroOnlySchema,
        });
        const parsed = schema.safeParse(query);
        if (!parsed.success) {
            throw new HttpException(
                parsed.error.format(),
                HttpStatus.BAD_REQUEST,
            );
        }

        const platforms = await this.platformService.getAllPlatforms(
            parsed.data,
        );

        return platformSchema.array().parse(platforms);
    }

    @Get("/closest")
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
    async getPlatformsByDistance(
        @Query() query,
    ): Promise<PlatformWithDistanceSchema[]> {
        const schema = z.object({
            latitude: z.coerce.number(),
            longitude: z.coerce.number(),
            count: z.coerce.number().int().nonnegative().default(0),
            metroOnly: metroOnlySchema,
        });

        const parsed = schema.safeParse(query);

        if (!parsed.success) {
            throw new HttpException(
                parsed.error.format(),
                HttpStatus.BAD_REQUEST,
            );
        }

        const platforms = await this.platformService.getPlatformsByDistance(
            parsed.data,
        );

        return platformWithDistanceSchema.array().parse(platforms);
    }

    @Get("/in-box")
    @ApiDescription({
        summary: "List of platforms within a given bounding box",
    })
    @ApiQueries([metroOnlyQuery, ...boundingBoxQuery])
    async getPlatformsInBoundingBox(@Query() query): Promise<PlatformSchema[]> {
        const schema = z.object({
            boundingBox: boundingBoxSchema,
            metroOnly: metroOnlySchema,
        });
        const parsed = schema.safeParse({
            boundingBox: {
                latitude: query?.latitude,
                longitude: query?.longitude,
            },
            metroOnly: query?.metroOnly,
        });

        if (!parsed.success) {
            throw new HttpException(
                "Invalid query params",
                HttpStatus.BAD_REQUEST,
            );
        }

        const platforms = await this.platformService.getPlatformsInBoundingBox(
            parsed.data,
        );

        return platformSchema.array().parse(platforms);
    }
}
