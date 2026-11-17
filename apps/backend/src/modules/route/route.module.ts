import { Module } from "@nestjs/common";

import { LeoModule } from "src/modules/leo/leo.module";
import { RouteController } from "src/modules/route/legacy/route.controller";
import { RouteResolver } from "src/modules/route/route.resolver";
import { RouteService } from "src/modules/route/route.service";

@Module({
    controllers: [RouteController],
    providers: [RouteService, RouteResolver],
    exports: [RouteService],
    imports: [LeoModule],
})
export class RouteModule {}
