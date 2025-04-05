import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { configModuleConfig } from "src/config/config-module.config";
import { ImportService } from "src/modules/import/import.service";
import { PrismaModule } from "src/modules/prisma/prisma.module";

describe("Import Module (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule.forRoot(configModuleConfig), PrismaModule],
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
            await app.get(ImportService).syncStops();
        },
        10 * 60 * 1_000,
    );
});
