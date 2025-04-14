import { Module } from "@nestjs/common";

import { PlatformModule } from "src/modules/platform/platform.module";
import { PlatformsByStopLoader } from "src/modules/dataloader/dataloader.service";

@Module({
    imports: [PlatformModule],
    providers: [PlatformsByStopLoader],
    exports: [PlatformsByStopLoader],
})
export class DataloaderModule {}
