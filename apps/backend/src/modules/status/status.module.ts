import { Module } from "@nestjs/common";

import { StatusController } from "src/modules/status/status.controller";
import { StatusService } from "src/modules/status/status.service";

@Module({
    controllers: [StatusController],
    providers: [StatusService],
    imports: [],
})
export class StatusModule {}
