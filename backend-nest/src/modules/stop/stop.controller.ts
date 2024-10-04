import { CacheTTL } from "@nestjs/cache-manager";
import { Controller, Get, Query } from "@nestjs/common";
import { StopService } from "./stop.service";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { metroOnlyQuery } from "src/swagger/query.swagger";

@CacheTTL(0)
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
