import { Module } from "@nestjs/common";

import { GolemioModule } from "src/modules/golemio/golemio.module";
import { InfotextsResolver } from "src/modules/infotexts/infotexts.resolver";
import { InfotextsService } from "src/modules/infotexts/infotexts.service";
import { InfotextsController } from "src/modules/infotexts/legacy/infotexts.controller";

@Module({
    controllers: [InfotextsController],
    providers: [InfotextsResolver, InfotextsService],
    imports: [GolemioModule],
})
export class InfotextsModule {}
