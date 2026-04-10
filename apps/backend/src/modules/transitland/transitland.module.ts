import { Module } from "@nestjs/common";

import { TransitlandService } from "src/modules/transitland/transitland.service";

@Module({
    providers: [TransitlandService],
    exports: [TransitlandService],
})
export class TransitlandModule {}
