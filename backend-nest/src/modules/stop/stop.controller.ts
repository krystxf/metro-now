import { Controller, Get, Query } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";

import { StopService } from "src/modules/stop/stop.service";
import { metroOnlyQuery } from "src/swagger/query.swagger";

@ApiTags("stop")
@Controller("stop")
export class StopController {
    constructor(private readonly stopService: StopService) {}

    @Get("/all")
    @ApiQuery(metroOnlyQuery)
    async getAllStops(
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ) {
        const metroOnly: boolean = metroOnlyQuery === "true";
        const stops = await this.stopService.getAll({ metroOnly });

        return stops;
    }
}
