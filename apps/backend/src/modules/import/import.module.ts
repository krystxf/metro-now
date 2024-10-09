import { Module } from "@nestjs/common";

import { ImportController } from "src/modules/import/import.controller";
import { ImportService } from "src/modules/import/import.service";

@Module({
    controllers: [ImportController],
    providers: [ImportService],
    imports: [],
})
export class ImportModule {}
