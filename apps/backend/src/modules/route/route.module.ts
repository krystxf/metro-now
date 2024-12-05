import { Module } from "@nestjs/common";

import { RouteController } from "src/modules/route/route.controller";
import { RouteService } from "src/modules/route/route.service";

@Module({
    controllers: [RouteController],
    providers: [RouteService],
    imports: [],
})
export class RouteModule {}
