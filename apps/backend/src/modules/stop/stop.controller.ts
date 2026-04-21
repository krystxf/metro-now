import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Query,
    Version,
} from "@nestjs/common";

import { EndpointVersion } from "src/enums/endpoint-version";
import { StopService } from "src/modules/stop/stop.service";

@Controller("stop")
export class StopController {
    constructor(private readonly stopService: StopService) {}

    @Get("/all")
    @Version([EndpointVersion.v1])
    async getAllStopsV1(
        @Query("metroOnly")
        metroOnlyValue: unknown,
        @Query("railOnly")
        railOnlyValue: unknown,
    ) {
        const metroOnly: boolean = metroOnlyValue === "true";
        const railOnly: boolean = railOnlyValue === "true" && !metroOnly;

        return this.stopService.getAll({ metroOnly, railOnly });
    }

    @Get(":id")
    @Version([EndpointVersion.v1])
    async getStopByIdV1(@Param("id") id: string) {
        if (!id) {
            throw new HttpException("Missing stop ID", HttpStatus.BAD_REQUEST);
        }

        const res = await this.stopService.getOneById(id);

        if (!res) {
            throw new HttpException("Stop ID not found", HttpStatus.NOT_FOUND);
        }

        return res;
    }
}
