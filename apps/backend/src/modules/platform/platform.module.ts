import { Module } from "@nestjs/common";

import { PlatformController } from "src/modules/platform/platform.controller";
import { PlatformService } from "src/modules/platform/platform.service";

@Module({
    controllers: [PlatformController],
    providers: [PlatformService],
    imports: [],
})
export class PlatformModule {}
