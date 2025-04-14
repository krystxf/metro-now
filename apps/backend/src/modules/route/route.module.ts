import { Module } from "@nestjs/common";

import { RouteController } from "src/modules/route/route.controller";
import { RouteResolver } from "src/modules/route/route.resolver";
import { RouteService } from "src/modules/route/route.service";

@Module({
    controllers: [RouteController],
    providers: [RouteService, RouteResolver],
    exports: [RouteService],
    imports: [],
})
export class RouteModule {}
