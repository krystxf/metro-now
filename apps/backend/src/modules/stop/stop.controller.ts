import { CacheInterceptor } from "@nestjs/cache-manager";
import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Query,
    UseInterceptors,
    Version,
} from "@nestjs/common";
import { ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";

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
    @Version([EndpointVersion.v1])
    @ApiQuery(metroOnlyQuery)
    async getAllStopsV1(
        @Query("metroOnly")
        metroOnlyQuery: unknown,
    ) {
        const metroOnly: boolean = metroOnlyQuery === "true";

        return this.stopService.getAll({ metroOnly });
    }

    @Get(":id")
    @Version([EndpointVersion.v1])
    @ApiParam({
        name: "id",
        description: "Stop ID",
        required: true,
        example: "U1040",
        type: "string",
    })
    async getStopByIdV1(@Param("id") id: string) {
        if (!id) {
            throw new HttpException("Missing stop ID", HttpStatus.BAD_REQUEST);
        }

        const res = await this.stopService.getStopById(id);

        if (!res) {
            throw new HttpException("Stop ID not found", HttpStatus.NOT_FOUND);
        }

        return res;
    }
}
