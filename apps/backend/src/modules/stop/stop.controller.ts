import { CacheInterceptor } from "@nestjs/cache-manager";
import {
    Controller,
    Get,
    Query,
    UseInterceptors,
    Version,
    VERSION_NEUTRAL,
} from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";

import { EndpointVersion } from "src/enums/endpoint-version";
import { LogInterceptor } from "src/modules/logger/log.interceptor";
import { StopService } from "src/modules/stop/stop.service";
import { metroOnlyQuery } from "src/swagger/query.swagger";

@ApiTags("stop")
@Controller("stop")
@UseInterceptors(CacheInterceptor, LogInterceptor)
export class StopController {
    constructor(private readonly stopService: StopService) {}

    @Get("/all")
    @Version([VERSION_NEUTRAL, EndpointVersion.v1])
    @ApiQuery(metroOnlyQuery)
    async getAllStops(
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ) {
        const metroOnly: boolean = metroOnlyQuery === "true";

        return this.stopService.getAll({ metroOnly });
    }
}
