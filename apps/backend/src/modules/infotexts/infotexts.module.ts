import { Module } from "@nestjs/common";

import { GolemioService } from "src/modules/golemio/golemio.service";
import { InfotextsController } from "src/modules/infotexts/infotexts.controller";
import { InfotextsService } from "src/modules/infotexts/infotexts.service";

@Module({
    controllers: [InfotextsController],
    providers: [InfotextsService, GolemioService],
    imports: [],
})
export class InfotextsModule {}
