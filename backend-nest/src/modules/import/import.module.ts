import { Module } from "@nestjs/common";
import { ImportService } from "./import.service";
import { ImportController } from "./import.controller";

@Module({
    controllers: [ImportController],
    providers: [ImportService],
    imports: [],
})
export class ImportModule {}
