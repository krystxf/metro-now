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

import { EndpointVersion } from "src/enums/endpoint-version";
import { RouteService } from "src/modules/route/route.service";

@Controller("route")
@UseInterceptors(CacheInterceptor)
export class RouteController {
    constructor(private readonly routeService: RouteService) {}

    @Get(":id")
    @Version([EndpointVersion.v1])
    async getRoute(@Param("id") id: unknown) {
        if (typeof id !== "string") {
            throw new HttpException("Missing route ID", HttpStatus.BAD_REQUEST);
        }

        return this.routeService.getOneGraphQL(id);
    }
}
