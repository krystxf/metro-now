import { Module } from "@nestjs/common";

import { RouteByIdLoader } from "src/modules/dataloader/route-by-id.loader";
import { RoutesByPlatformIdLoader } from "src/modules/dataloader/routes-by-platform.loader";
import { RouteModule } from "src/modules/route/route.module";

@Module({
    imports: [RouteModule],
    providers: [RoutesByPlatformIdLoader, RouteByIdLoader],
    exports: [RoutesByPlatformIdLoader, RouteByIdLoader],
})
export class RoutesByPlatformIdLoaderModule {}
