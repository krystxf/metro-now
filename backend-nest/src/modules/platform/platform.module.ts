import { Module } from "@nestjs/common";

import { PlatformService } from "src/modules/platform/platform.service";
import { PlatformController } from "src/modules/platform/platform.controller";

@Module({
    controllers: [PlatformController],
    providers: [PlatformService],
    imports: [],
})
export class PlatformModule {}
