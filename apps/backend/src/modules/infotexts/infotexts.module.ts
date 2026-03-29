import { Module } from "@nestjs/common";

import { GolemioModule } from "src/modules/golemio/golemio.module";
import { InfotextsController } from "src/modules/infotexts/infotexts.controller";
import { InfotextsResolver } from "src/modules/infotexts/infotexts.resolver";
import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { PlatformModule } from "src/modules/platform/platform.module";

@Module({
    controllers: [InfotextsController],
    providers: [InfotextsResolver, InfotextsService],
    imports: [GolemioModule, PlatformModule],
})
export class InfotextsModule {}
