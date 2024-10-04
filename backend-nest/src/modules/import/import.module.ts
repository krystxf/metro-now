import { Module } from "@nestjs/common";
import { ImportService } from "src/modules/import/import.service";
import { ImportController } from "src/modules/import/import.controller";

@Module({
    controllers: [ImportController],
    providers: [ImportService],
    imports: [],
})
export class ImportModule {}
