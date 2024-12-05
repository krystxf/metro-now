import { Injectable } from "@nestjs/common";

import { GolemioService } from "src/modules/golemio/golemio.service";

@Injectable()
export class InfotextsService {
    constructor(private golemioService: GolemioService) {}

    async getInfotexts() {
        return await this.golemioService.getGolemioData("/v3/pid/infotexts");
    }
}
