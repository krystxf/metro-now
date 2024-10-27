import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { configModuleConfig } from "src/config/config-module.config";
import { StopSyncTrigger } from "src/enums/log.enum";
import { ImportService } from "src/modules/import/import.service";
import { LoggerModule } from "src/modules/logger/logger.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";

describe("Import Module (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot(configModuleConfig),
                PrismaModule,
                LoggerModule,
            ],
            providers: [ImportService],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    test(
        "Run import",
        async () => {
            await app.get(ImportService).syncStops(StopSyncTrigger.TEST);
        },
        10 * 60 * 1_000,
    );
});
