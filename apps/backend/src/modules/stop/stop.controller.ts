import { CacheInterceptor } from "@nestjs/cache-manager";
import { Controller, Get, Query, UseInterceptors } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "src/modules/logger/logger.service";
import { StopService } from "src/modules/stop/stop.service";
import { metroOnlyQuery } from "src/swagger/query.swagger";
import { measureDuration } from "src/utils/measure-duration";

@ApiTags("stop")
@Controller("stop")
@UseInterceptors(CacheInterceptor)
export class StopController {
    constructor(
        private readonly stopService: StopService,
        private readonly logger: LoggerService,
    ) {}

    @Get("/all")
    @ApiQuery(metroOnlyQuery)
    async getAllStops(
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ) {
        const metroOnly: boolean = metroOnlyQuery === "true";
        const [stops, duration] = await measureDuration(
            this.stopService.getAll({ metroOnly }),
        );

        await this.logger.createRestLog("/stop/all", duration);

        return stops;
    }
}
