import { CacheInterceptor } from "@nestjs/cache-manager";
import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";

import { LogInterceptor } from "src/modules/logger/log.interceptor";
import { StopService } from "src/modules/stop/stop.service";
import { metroOnlyQuery } from "src/swagger/query.swagger";

@ApiTags("stop")
@Controller("stop")
@UseInterceptors(CacheInterceptor, LogInterceptor)
export class StopController {
    constructor(private readonly stopService: StopService) {}

    @Get("/all")
    @ApiQuery(metroOnlyQuery)
    async getAllStops(
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ) {
        const metroOnly: boolean = metroOnlyQuery === "true";

        return this.stopService.getAll({ metroOnly });
    }
}
