import { CacheInterceptor } from "@nestjs/cache-manager";
import {
    Controller,
    Get,
    HttpException,
    HttpStatus,
    Param,
    UseInterceptors,
    Version,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";

import { EndpointVersion } from "src/enums/endpoint-version";
import { RouteService } from "src/modules/route/route.service";

@ApiTags("route")
@Controller("route")
@UseInterceptors(CacheInterceptor)
export class RouteController {
    constructor(private readonly routeService: RouteService) {}

    @Get(":id")
    @Version([EndpointVersion.v1])
    @ApiParam({
        name: "id",
        description: "Route ID",
        required: true,
        example: "L991",
        type: "string",
    })
    async getRoute(@Param("id") id: unknown) {
        if (typeof id !== "string") {
            throw new HttpException("Missing route ID", HttpStatus.BAD_REQUEST);
        }

        return this.routeService.getRoute(id);
    }
}
