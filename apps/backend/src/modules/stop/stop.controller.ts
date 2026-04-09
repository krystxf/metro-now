import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Query,
    Version,
} from "@nestjs/common";
import { ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";

import { EndpointVersion } from "src/enums/endpoint-version";
import { StopService } from "src/modules/stop/stop.service";
import { metroOnlyQuery, railOnlyQuery } from "src/swagger/query.swagger";

@ApiTags("stop")
@Controller("stop")
export class StopController {
    constructor(private readonly stopService: StopService) {}

    @Get("/all")
    @Version([EndpointVersion.v1])
    @ApiQuery(metroOnlyQuery)
    @ApiQuery(railOnlyQuery)
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

        const res = await this.stopService.getOneById(id);

        if (!res) {
            throw new HttpException("Stop ID not found", HttpStatus.NOT_FOUND);
        }

        return res;
    }
}
