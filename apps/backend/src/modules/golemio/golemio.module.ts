import { Module } from "@nestjs/common";

import { GolemioService } from "src/modules/golemio/golemio.service";

@Module({
    providers: [GolemioService],
    exports: [GolemioService],
})
export class GolemioModule {}
