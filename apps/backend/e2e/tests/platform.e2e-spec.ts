import { CacheModule } from "@nestjs/cache-manager";
import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";

import { getRequestTestLabel } from "e2e/constant/test-label";
import {
    generateParamsArray,
    generateTestUrls,
} from "e2e/utils/generate-test-urls";
import { cacheModuleConfig } from "src/config/cache-module.config";
import { configModuleConfig } from "src/config/config-module.config";
import { PlatformModule } from "src/modules/platform/platform.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";

describe("Platform Module (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                CacheModule.register(cacheModuleConfig),
                ConfigModule.forRoot(configModuleConfig),
                PrismaModule,
                PlatformModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    test.each(
        generateTestUrls("/platform/all", [
            generateParamsArray("metroOnly"),

            generateParamsArray("metroOnly", true),

            generateParamsArray("metroOnly", false),
        ]),
    )(getRequestTestLabel, async (url) => {
        const response = await request(app.getHttpServer())
            .get(url)
            .expect(200)
            .accept("application/json");

        expect(response.body).toBeDefined();
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);
    });
});
