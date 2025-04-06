import { Module } from "@nestjs/common";

import { GolemioService } from "src/modules/golemio/golemio.service";
import { InfotextsController } from "src/modules/infotexts/infotexts.controller";
import { InfotextsResolver } from "src/modules/infotexts/infotexts.resolver";
import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { PlatformService } from "src/modules/platform/platform.service";

@Module({
    controllers: [InfotextsController],
    providers: [
        InfotextsResolver,
        InfotextsService,
        GolemioService,
        PlatformService,
    ],
    imports: [],
})
export class InfotextsModule {}
