import { CacheTTL } from "@nestjs/cache-manager";
import { Controller, Get, Query } from "@nestjs/common";
import { StopService } from "./stop.service";

@CacheTTL(0)
@Controller("stop")
export class StopController {
    constructor(private readonly stopService: StopService) {}

    @Get("/all")
    async getAllStops(
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ) {
        const metroOnly = Boolean(metroOnlyQuery);
        const stops = await this.stopService.getAll({ metroOnly });

        return stops;
    }
}
