import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { Controller, Get, UseInterceptors, Version } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { EndpointVersion } from "src/enums/endpoint-version";
import { InfotextsService } from "src/modules/infotexts/infotexts.service";

@ApiTags("infotexts")
@Controller("infotexts")
@UseInterceptors(CacheInterceptor)
@CacheTTL(4 * 1000)
export class InfotextsController {
    constructor(private readonly infotextsService: InfotextsService) {}

    @Get("/")
    @Version([EndpointVersion.v1])
    async getInfotextsV1() {
        return this.infotextsService.getAll();
    }
}
