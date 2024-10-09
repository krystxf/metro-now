import { Module } from "@nestjs/common";

import { PlatformController } from "src/modules/platform/platform.controller";
import { PlatformResolver } from "src/modules/platform/platform.resolver";
import { PlatformService } from "src/modules/platform/platform.service";

@Module({
    controllers: [PlatformController],
    providers: [PlatformResolver, PlatformService],
    imports: [],
})
export class PlatformModule {}
