import { Module } from "@nestjs/common";

import { RoutesByPlatformIdLoader } from "src/modules/dataloader/routes-by-platform.loader";
import { RouteModule } from "src/modules/route/route.module";

@Module({
    imports: [RouteModule],
    providers: [RoutesByPlatformIdLoader],
    exports: [RoutesByPlatformIdLoader],
})
export class RoutesByPlatformIdLoaderModule {}
