import { CacheInterceptor } from "@nestjs/cache-manager";
import { Controller, Get, UseInterceptors, Version } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";

import { ApiDescription } from "src/decorators/swagger.decorator";
import { EndpointVersion } from "src/enums/endpoint-version";
import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { metroOnlyQuery } from "src/swagger/query.swagger";

@ApiTags("infotexts")
@Controller("infotexts")
@UseInterceptors(CacheInterceptor)
export class InfotextsController {
    constructor(private readonly infotextsService: InfotextsService) {}

    @Get("/all")
    @Version([EndpointVersion.v1])
    @ApiDescription({
        summary: "PID Infotexts",
    })
    @ApiQuery(metroOnlyQuery)
    async getAllInfotexts() {
        return await this.infotextsService.getInfotexts();
    }
}
