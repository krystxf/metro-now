import { Module } from "@nestjs/common";

import { PlatformsByStopLoader } from "src/modules/dataloader/platforms-by-stop.loader";
import { PlatformModule } from "src/modules/platform/platform.module";

@Module({
    imports: [PlatformModule],
    providers: [PlatformsByStopLoader],
    exports: [PlatformsByStopLoader],
})
export class DataloaderModule {}
